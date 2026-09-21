# Handoff (2026-09-21)

Read first: `CLAUDE.md` (traps), `planning.txt` (spec). Plan for this step: `~/.claude/plans/make-the-fields-a-fancy-planet.md`.

## State

- Steps 1 to 10 done, plus step 11 (multi-farm dashboard) implemented. Branch `HEAD` (detached), last commit eedd6d7. **Everything since eedd6d7 is uncommitted** (copy rewrite, visual pass, back button, step 11).
- Verified: typecheck, lint, 148 tests, `npm run build`, `npm audit` 0. `npm run seed` ran against the real dataset (3 farms, 12 fields, 18 seasons). `POST /api/advance` with the cron bearer advanced 17 of 18 seasons; real GDD totals now appear (e.g. 1409 GDD).
- **Not verified:** any signed-in render. No browser check of the picker, farm switcher, field selector fade, season board (3/4/5 cards), compare, CSV export, collapsible activity, or the new visuals/animations. Signed-out redirects for `/dashboard` and `/dashboard/[farm]` not re-checked (the curl used a path Git Bash rewrote).

## What changed in step 11

- **GDD bug fixed:** seeded crop names ("Wheat (SST 88)") never matched `cropModelFor`, so GDD and the reconciler were dead. Crop now has `gddModelKey` (schema, seed, queries, `/api/advance`, season page, dashboard).
- Field schema has optional `coordinates`; queries use `select(defined(field->coordinates) => ..., field->farm->coordinates)`. **The seed sets no field coordinates**, so fields use their farm's point; per-field weather is identical within a farm. Farm points are approximate town centres, commented in `scripts/seed.ts`.
- `/dashboard` is the farm picker (cookie `mecropolis-farm`, `?pick=1` forces the picker); `/dashboard/[farm]` is the dashboard. Server action `chooseFarm` (`src/app/(app)/dashboard/actions.ts`) validates the slug against Sanity. Header `FarmSwitcher` shows when there are 2+ farms.
- New: `src/lib/dashboard/{alerts,summary,csv,board}.ts` (+ tests), components `SeasonBoard`, `FieldExplorer`, `CompareFields`, `ExportButton`, `AlertsPanel`, `CollapsibleSection`; `SeasonProgressCard` now takes a `BoardSeason`.
- Recent activity is collapsible and farm-scoped (limit 20). Season board caps at 5 cards (3/4/5), grid widens at 4 and 5.

## Next

1. Sign in and walk `/dashboard` (picker), a farm dashboard, a season page, `/studio`: both themes, phone width. Fix what breaks.
2. Deviations to decide: selections are not persisted in `localStorage` (plan said they would be); `typegen` not rerun after the two schema additions (`sanity/types.ts` is imported nowhere); `CompareFields` sends a per-season cumulative array to the client (payload not measured).
3. Docs not yet updated: `planning/roadmap.md` (add step 11), `architecture.md`, `decisions.md` (gddModelKey, field coordinate fallback), `README.md` (seed then `POST /api/advance`), `CLAUDE.md` (routing, seed order). Security division review not run.
4. Ship with the `ship` skill (do not stage `CLAUDE.md`). Submission write-up. Deadline 2026-10-04.

## Open threads

- **Slow render / stale `/` (2026-09-21):** landing and dashboard data use `unstable_cache` (30 min, fixed keys like `landing-weather`), so stale values survive code changes and browser cache clears until expiry or a dev restart. I deleted `.next/*/cache/fetch-cache` and restarted `next dev`; the user was about to check `/`. Unconfirmed what looked old. Slowness causes are unmeasured: cold cache (one Open-Meteo call per active season blocks `/dashboard/[farm]`), dev compile, uncached Sanity reads in `(app)/layout.tsx`. Proposed: `<Suspense>` skeletons for the board and conditions, cron cache warm-up, tagged Sanity caching revalidated by the webhook.

- Seed replaces farm, fields and crops (`createOrReplace`); seasons use `createIfNotExists`, so old seasons keep their old data. Lupin benchmark: HarvestStat 2000 to 2007 only, 0 docs.
- 18 seasons means more Open-Meteo archive calls per dashboard render (30 min cache per point); first render after a miss may be slow. Not measured.
- No CSP. No sign-in throttle. Routes echo upstream error messages. `FAS_API_KEY` is sent in a query string. GDD parameters are hand-authored and uncited.
- `sanity/schemaTypes/weatherSnapshot.ts` fails `format:check` (not touched). No git remote.
