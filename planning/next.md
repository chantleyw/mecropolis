# Handoff (2026-09-21)

Read first: the "ADOPTED DESIGN" section at the end of `~/.claude/plans/pasted-content-id-60a5-production-suppl-scalable-lobster.md`. Spec: `planning.txt`. Traps: `CLAUDE.md`.

## State

- Steps 1 to 3 of the adopted design done: `src/lib/agronomy/{gdd,cropModel}.ts`, guard rewrite, `reconcile.ts`, `seasonWindow`, `api/advance` (transition route deleted), `vercel.json`, `CRON_SECRET`/`FAS_API_KEY` env, season schema (`derivedMaturityDate`, stageChange `effectiveDate/basis/gddTotal/derivedFrom`, readOnly `yieldAmount`) and typegen.
- 94 tests, typecheck, lint and build pass; audit 0.
- `/api/advance` not exercised live (writes to the real dataset).

## Next

Step 4 remainder: `crop.benchmarks` + `pestWatch`, new `benchmark` doc type, `pestReport` fields, treatment/observation readOnly. Then Step 5 (benchmarks: units, psd, harveststat, resolve, sync). Until then `benchmarkResolved` is false for every crop, so seasons stop at `harvested`.

## Open threads

- GDD parameters (base, cap, emergence, maturity) are hand-authored and uncited.
- Unverified: HarvestStat `qc_flag` meaning and admin_2 double-counting; Open-Meteo archive tail lag (coverage guard is 90%; may need `pastDays`).
- `seasonWindow` end is bounded at 2x growthCycleDays (my choice, not in the plan).
- Reconciler blocks a hop whose effectiveDate is in the future (e.g. future plantingDate).
- `sanity/schemaTypes/weatherSnapshot.ts` fails `format:check` (not touched here).
- Not verified from earlier phases: Season B real snapshot, Sanity dashboard webhook, browser sign-in.
- Deadline 2026-10-04.
