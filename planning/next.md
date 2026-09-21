# Handoff (2026-09-21)

Read first: the "ADOPTED DESIGN" section at the end of `~/.claude/plans/pasted-content-id-60a5-production-suppl-scalable-lobster.md`. Spec: `planning.txt`. Traps: `CLAUDE.md`.

## State

- Steps 1 to 6 of the adopted design done. Step 6: World Bank source in `resolveBenchmarks`, `src/lib/geo/distance.ts`, `src/lib/pests/regional.ts`, `GET|POST /api/pests`, `scripts/seed.ts` (`npm run seed`, tsx added as devDependency).
- Docs updated (README, `planning/`, `api/`, `references/`).
- Tests, typecheck, lint, build pass; audit 0.
- Verified live (read-only probe): PSD, HarvestStat and World Bank resolve for wheat; GBIF returns records for both pests.
- Not run: `npm run seed` (writes the real dataset), `/api/advance`, `/api/pests` routes, Studio rendering of schema changes.

## Next

Run `npm run seed` (needs user OK), then Step 7: UI (stage pipeline with live GDD progress and citation, "Reconcile now", yield "Not recorded", separate "Regional benchmark, not this field" card, regional pest panel). Never show a ratio or delta between benchmark and field.

## Open threads

- Seed replaces farm, fields and crops (`createOrReplace`); seasons use `createIfNotExists`.
- Lupin benchmark is HarvestStat 2000 to 2007 only; no PSD series.
- GDD parameters (base, cap, emergence, maturity) are hand-authored and uncited.
- Unverified: HarvestStat `qc_flag` meaning and admin_2 double-counting; Open-Meteo archive tail lag (coverage guard is 90%; may need `pastDays`).
- `seasonWindow` end is bounded at 2x growthCycleDays (my choice, not in the plan).
- Reconciler blocks a hop whose effectiveDate is in the future.
- `sanity/schemaTypes/weatherSnapshot.ts` fails `format:check` (not touched here).
- Not verified from earlier phases: Season B real snapshot, Sanity dashboard webhook, browser sign-in.
- Security review (medium/low, unfixed): no security headers in `next.config.ts`; in-memory rate limiter never evicts keys; no `/api/advance` or `/api/pests` route test for 401; upstream error messages echoed by advance, weather, webhook routes; no `session.maxAge`, no sign-in throttle.
- Deadline 2026-10-04.
