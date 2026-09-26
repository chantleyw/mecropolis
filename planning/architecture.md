# Architecture

## Components

- **Sanity dataset** (public-read): system of record. Types: farm, field, crop, season, treatment, observation, pestReport, weatherSnapshot, benchmark, agronomyRecommendation, regionGrid. No Studio.
- **SPA** (Vite + React, Cloudflare Pages static assets): React Router routes in `src/main.tsx`. Reads Sanity anonymously through the API CDN (`src/lib/sanity/client.ts`) and keeps views live with the Live Content API (`useLive`, sync tags). `AppLayout` is a UX gate only.
- **Pages Functions** (`functions/`): session login (signed cookie, `functions/_lib/session.ts`), every write, and reads that need a secret (`/api/landing`, `/api/conditions`). Signed-in handlers use `guard` in `functions/_lib/http.ts` (session, same-origin, rate limit).
- **Security headers**: `public/_headers` sets a Content-Security-Policy for every route. The inline theme script in `index.html` is allowed by sha256 hash; `src/csp.test.ts` fails when the script and the hash drift apart. Adding a browser-side host means adding it to `connect-src` or `img-src`.
- **Pure core** (no I/O, unit tested): `src/lib/agronomy` (GDD), `src/lib/workflow` (`machine.ts`, `guards.ts`, `reconcile.ts`), `src/lib/benchmark/units.ts`.
- **Adapters** (network, Zod-validated through `src/lib/http/fetchJson.ts`: timeout, one retry on 5xx): `src/lib/weather`, `src/lib/data/*`.
- **Write path**: `writeClient(env)` in `functions/_lib/sanity.ts` is the only user of the write token.

## Season advance flow

```
GET|POST /api/advance
  auth (session or Bearer CRON_SECRET) -> rate limit -> load seasons
  per season: one Open-Meteo archive fetch over seasonWindow -> accumulateGdd
  planAdvances(season, ctx) -> hops[] (one per state-machine step, guards evaluated)
  one Sanity transaction with ifRevisionId (409 on conflict), one weatherSnapshot per run
```

Stage is never typed in. Guards: `emerged`, `maturing`, `matured`, `contextComplete` (season archive snapshot plus resolved benchmark). Each failure names its number and threshold. The reconciler never proposes rejection and never writes `actualHarvest` or `yieldAmount`.

`benchmarkResolved` is true when the crop has `benchmarks.unavailableReason` or at least one `benchmark` document exists for it. Until benchmarks are synced, seasons stop at `harvested`.

## Benchmark flow (step 5)

```
crop.benchmarks {psdCommodityCode, harvestStatProduct, worldBankIndicator, unavailableReason}
  -> resolveBenchmarks(input, deps)      src/lib/benchmark/resolve.ts
       psd:         fetchPsdYield          national, live, kg/ha (MT/HA x1000)
       harveststat: provinceYield          provincial, committed JSON, kg/ha
       worldbank:   fetchWorldBankYield    national, live, kg/ha; only when worldBankIndicator is set
  -> Resolution: available{sources, partialFailures} | unavailable{reason}
  -> syncBenchmarks(writer, cropId, resolution)   upserts benchmark.<cropId>.<source>
```

`resolveBenchmarks` takes injected dependencies so it is tested without network. It does not call the network when the crop sets `unavailableReason`. A failing source is reported in `partialFailures`; the other still counts. `scripts/seed.ts` (`npm run seed`) calls it for every crop after writing the farm, fields, crops and seasons (at `planning`; `createIfNotExists`, so a rerun does not reset progress). The seed never writes stage history, yields, treatments or observations.

## Regional pests (step 6)

`GET /api/pests?seasonId=` reads the crop `pestWatch`, queries GBIF for records within 100 km of the farm (bounding box filtered by haversine; GBIF `geoDistance` times out), and returns sightings with `distanceKm` (`src/lib/geo/distance.ts`, `src/lib/pests/regional.ts`). `POST /api/pests {seasonId}` stores them as `pestReport` documents (`scope: regional`, `source: gbif`, no severity, `createIfNotExists`). Session required.

## Recommendations (step 13)

`agronomyRecommendation` documents move `proposed → approved | rejected`, `approved → completed`, any open status `→ expired` (`src/lib/recommendations/machine.ts`). `POST /api/recommendations` creates a `proposed` one from a season as a Sanity draft (Actions API), read back through the session-guarded `GET /api/recommendations` because drafts are not public; approve and reject publish the draft, then set the status; `POST /api/recommendations/:id/{approve,reject,complete}` (Pages Functions) change status with `ifRevisionId`. Session required, rate limited, writes through `writeClient` only. The farm dashboard lists them with approve/reject controls. Nothing writes `approved` except a signed-in user.

## Sanity depth (Milestone 5)

- **Field photo**: `POST /api/assets` uploads to the Assets API with `lqip` and `palette` extraction, sets the hotspot from the chosen focus point, and swaps the old asset out in one transaction. Global cap 20/h.
- **Season notes**: separate dated `seasonNote` entries (Portable Text) on the season, saved by `POST /api/notes` with `ifRevisionId` (409 on a stale revision). Each note is owned by the account that wrote it (`ownerId`); only that account may edit, delete or restore it (`ownsNote` in `src/lib/notes.ts`, enforced in the Functions).
- **History**: `GET /api/history` reads the History API transactions and revisions for the timeline.
- **Sanity Functions** (`sanity-functions/`, org-scoped Blueprint stack `mecropolis`): `reconcile-on-observation` fires on create of an observation or a weatherSnapshot not written by reconcile and posts `{ seasonId }` to `/api/advance` with `Bearer CRON_SECRET`; `nightly-reconcile` (02:00 UTC) posts `{}` to walk every season. Both throw on a non-2xx response so failures show in `sanity blueprints logs`.
- **Webhook** (being retired once the document function is verified): Sanity GROQ webhook on observation and weatherSnapshot create calls `POST /api/webhook/sanity`; the HMAC signature is verified, then the season is reconciled.

## Boundaries

- `process.env` only in `sanity/project.ts` and `scripts/seed.ts` (ESLint); the SPA reads `src/lib/publicEnv.ts`, Functions validate `context.env` in `functions/_lib/env.ts`.
- Functions must not import `src/lib/sanity/queries.ts` (its client reads `import.meta.env`).
- Data modules take secrets as arguments (`fetchPsdYield(params, apiKey)`), so they stay env-free.
- No `console.*`, no `any`, no swallowed errors.
