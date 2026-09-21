# Handoff (2026-09-21)

Read first: the "ADOPTED DESIGN" section at the end of `~/.claude/plans/pasted-content-id-60a5-production-suppl-scalable-lobster.md`. Spec: `planning.txt`. Traps: `CLAUDE.md`.

## State

- Steps 1 to 4 of the adopted design done: agronomy, guards, reconciler, `api/advance`, and schema (crop.benchmarks + pestWatch, `benchmark` doc type, pestReport source/scope fields, treatment/observation readOnly). Typegen run.
- 94 tests, typecheck, lint and build pass; audit 0.
- `/api/advance` not exercised live (writes to the real dataset). Schema changes not exercised in Studio.

## Next

Step 5: benchmarks (`src/lib/benchmark/units.ts`, `data/psd.ts`, `scripts/extract-harveststat.mjs`, `data/harveststat.ts`, `benchmark/resolve.ts`, `sync.ts`). Until then `benchmarkResolved` is false for every crop, so seasons stop at `harvested`.

## Open threads

- Existing crop docs have no `benchmarks`; they fail validation in Studio until seeded (Step 6 seed).
- GDD parameters (base, cap, emergence, maturity) are hand-authored and uncited.
- Unverified: HarvestStat `qc_flag` meaning and admin_2 double-counting; Open-Meteo archive tail lag (coverage guard is 90%; may need `pastDays`).
- `seasonWindow` end is bounded at 2x growthCycleDays (my choice, not in the plan).
- Reconciler blocks a hop whose effectiveDate is in the future.
- `sanity/schemaTypes/weatherSnapshot.ts` fails `format:check` (not touched here).
- Not verified from earlier phases: Season B real snapshot, Sanity dashboard webhook, browser sign-in.
- Security review (medium/low, unfixed): no security headers in `next.config.ts`; in-memory rate limiter is per instance and never evicts keys; no `/api/advance` route test for 401; upstream error messages echoed to clients (advance, weather, webhook routes); no `session.maxAge`, no sign-in throttle.
- Deadline 2026-10-04.
