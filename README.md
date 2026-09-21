# Mecropolis

Field and crop tracker for a Western Cape farm. Season stage is calculated from live weather. Regional yield statistics are listed separately with their source.

## What it does

- Stores farms, fields, crops, seasons, pest reports and weather snapshots in Sanity (embedded Studio at `/studio`).
- Advances each season through `planning, planted, growing, pre-harvest, harvested, review` by accumulating growing degree days (GDD) from Open-Meteo weather (`POST|GET /api/advance`).
- Attaches real weather and soil data (Open-Meteo, SoilGrids) and regional yield benchmarks (USDA PSD, HarvestStat-Africa).
- Annotates high-severity pest reports with a humidity-aware risk assessment through a signed Sanity webhook.

## Data rules

- No fake or synthetic data. Weather and soil come from live APIs.
- Nothing writes `season.yieldAmount`. Treatments, yields and observations are read-only in Studio.
- Benchmarks are stored in their own `benchmark` documents and are not compared with a field's yield.
- Crop model parameters (`src/lib/agronomy/cropModel.ts`) are hand-authored and have no citations yet.

## Stack

Next.js 16 (App Router), React 19, Sanity 6 + `next-sanity`, Auth.js v5 (`next-auth@beta`), Zod, Vitest, Tailwind 4.

## Setup

```bash
npm install
cp .env.example .env.local      # fill in every value; see references/environment.md
node scripts/hash-password.mjs '<password>'   # paste output into AUTH_DEMO_PASSWORD_HASH
npm run dev                     # http://localhost:3000, Studio at /studio
```

All configuration is read through `src/lib/env.ts`; the app fails at boot when a variable is missing.

## Commands

| Command                                      | Purpose                                                   |
| -------------------------------------------- | --------------------------------------------------------- |
| `npm run dev / build / start`                | Run, build, serve                                         |
| `npm run typecheck / lint / format:check`    | Static checks                                             |
| `npm test`                                   | Vitest unit tests (no network)                            |
| `npm run typegen`                            | Regenerate Sanity types (see `references/environment.md`) |
| `node scripts/extract-harveststat.mjs [csv]` | Rebuild `src/lib/data/harveststat-za.json`                |

## Layout

```
src/app/api/        route handlers (advance, weather, webhook/sanity, auth)
src/lib/agronomy/   GDD maths and crop model parameters (pure)
src/lib/workflow/   state machine, guards, reconciler (pure) and effects
src/lib/weather/    Open-Meteo client, summaries, pest risk
src/lib/data/       SoilGrids, GBIF, World Bank, USDA PSD, HarvestStat
src/lib/benchmark/  unit conversion, benchmark resolution, Sanity sync
sanity/schemaTypes/ document schemas
planning/  api/  references/   technical documentation
```

## Documentation

Start at [planning/index.md](planning/index.md). Endpoint contracts are in [api/endpoints.md](api/endpoints.md), external services in [references/external-services.md](references/external-services.md), design decisions in [planning/decisions.md](planning/decisions.md).

## Security

Every route except sign-in, Auth.js, the signature-verified Sanity webhook and `/api/advance` (which authenticates itself with a session or `CRON_SECRET`) requires a session. The Sanity write token is only imported in a `server-only` module. `npm audit` is kept at 0.

## Status

Build steps 1 to 11 of the adopted design are done (agronomy, guards, reconciler, schema, benchmarks, seed, regional sources, UI at `/dashboard` and `/seasons/[id]`, public marketing site at `/`, `/about`, `/docs`, light/dark toggle, live weather, soil, pest and yield panels on `/`, farm picker, farm conditions, season board, compare, CSV export and activity on `/dashboard`). `npm run seed` writes the demo configuration to the configured dataset; then run `POST /api/advance` (cron bearer) to compute GDD and stages. See [planning/roadmap.md](planning/roadmap.md).
