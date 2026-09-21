# Architecture

## Components

- **Sanity dataset**: system of record. Types: farm, field, crop, season, treatment, observation, pestReport, weatherSnapshot, benchmark. Studio is embedded at `/studio` (client wrapper `Studio.tsx`).
- **Next.js app**: pages plus route handlers. Auth.js v5 credentials login; `src/proxy.ts` is an optimistic gate, handlers still call `auth()`.
- **Pure core** (no I/O, unit tested): `src/lib/agronomy` (GDD), `src/lib/workflow` (`machine.ts`, `guards.ts`, `reconcile.ts`), `src/lib/benchmark/units.ts`.
- **Adapters** (network, Zod-validated through `src/lib/http/fetchJson.ts`: timeout, one retry on 5xx): `src/lib/weather`, `src/lib/data/*`.
- **Server-only write path**: `src/lib/sanity/writeClient.ts` is the only user of the write token.

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

`GET /api/pests?seasonId=` reads the crop `pestWatch`, queries GBIF for records within 100 km of the farm (`geoDistance`), and returns sightings with `distanceKm` (`src/lib/geo/distance.ts`, `src/lib/pests/regional.ts`). `POST /api/pests {seasonId}` stores them as `pestReport` documents (`scope: regional`, `source: gbif`, no severity, `createIfNotExists`). Session required.

## Recommendations (step 13)

`agronomyRecommendation` documents (Studio read-only) move `proposed → approved | rejected`, `approved → completed`, any open status `→ expired` (`src/lib/recommendations/machine.ts`). `POST /api/recommendations` creates a `proposed` one from a season; `POST /api/recommendations/[id]/{approve,reject,complete}` change status with `ifRevisionId`. Session required, rate limited, writes through `writeClient` only. The farm dashboard lists them with approve/reject controls. Nothing writes `approved` except a signed-in user.

## Boundaries

- `process.env` only in `src/lib/env.ts` (ESLint); client code reads `src/lib/publicEnv.ts`.
- Data modules take secrets as arguments (`fetchPsdYield(params, apiKey)`), so they stay env-free.
- No `console.*`, no `any`, no swallowed errors.
