# Handoff (2026-09-21)

Read first: the "ADOPTED DESIGN" section at the end of `~/.claude/plans/pasted-content-id-60a5-production-suppl-scalable-lobster.md`. Spec: `planning.txt`. Traps: `CLAUDE.md`.

## State

- Steps 1 to 7 of the adopted design done. Seed run (wheat 3 benchmark docs, canola 2, lupins 0: HarvestStat has no rows in range).
- Step 8: public marketing site at `/`, `/about`, `/docs`; dashboard moved to `/dashboard`; theme toggle. Signed-out routing verified by curl.
- Step 7 UI: `/dashboard` farm overview with fields and seasons (no separate field page), `/seasons/[id]` (stage pipeline, live GDD progress, "Reconcile now", yield "Not recorded", "Regional benchmark, not this field" card, regional pest panel with "Load regional sightings"). Reads in `src/lib/sanity/queries.ts`; button in `src/components/ApiButton.tsx`. No benchmark/field ratio anywhere.
- Tests (119), typecheck, lint, build pass. Unauthenticated `/` and `/seasons/x` redirect to `/signin`.
- Not verified: signed-in render of either page, "Reconcile now" and "Load regional sightings" clicks, `/api/advance` and `/api/pests` live, Studio rendering of schema changes.

## Next

Sign in (now lands on /dashboard) and walk the UI once, including the theme toggle and marketing pages at phone width (Season A wheat benchmark, Season C "no regional benchmark", lupins none); fix what breaks. Then final security review, README/submission post, and cut-ladder decisions. Styling is minimal Tailwind; polish if time allows.

## Open threads

- Seed replaces farm, fields and crops (`createOrReplace`); seasons use `createIfNotExists`.
- Lupin benchmark is HarvestStat 2000 to 2007 only; no PSD series; seed reports 0 docs.
- GDD parameters are hand-authored and uncited; the UI says so.
- Unverified: HarvestStat `qc_flag` meaning and admin_2 double-counting; Open-Meteo archive tail lag (coverage guard 90%).
- `seasonWindow` end is bounded at 2x growthCycleDays (my choice). Reconciler blocks a hop whose effectiveDate is in the future.
- `sanity/schemaTypes/weatherSnapshot.ts` fails `format:check` (not touched).
- Security review (medium/low, unfixed): no security headers in `next.config.ts`; in-memory rate limiter never evicts keys; no 401 route tests for `/api/advance` or `/api/pests`; upstream error messages echoed; no `session.maxAge`, no sign-in throttle.
- Season page fetches the Open-Meteo archive on every render (no caching).
- Landing links no repo (no git remote); add one once the repo is public.
- Deadline 2026-10-04.
