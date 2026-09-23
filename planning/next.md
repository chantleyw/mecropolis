# Handoff (2026-09-24)

Read first: `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`. Active plan: `~/.claude/plans/alright-we-need-to-humming-clock.md`.

## State

Branch `master`. M4 done (roadmap row 22): Functions `recommendations` (create, `:id/:action`),
`advance`, `scenario`, `weather`, `pests`, `treatments`; shared `guard` in `functions/_lib/http.ts`;
field log schemas in `src/lib/fieldLog.ts` (form and Function). Season page has Reconcile now,
What if?, Field log, Fetch sightings. Contracts: `api/endpoints.md`. Test helpers `functions/_test/`.

## Next

M5 (Sanity depth): assets, Portable Text notes, History API timeline, webhook -> reconciler,
schema deploy, live listeners.

## Open threads

- Nothing pushed; M3b and M4 not deployed. `CRON_SECRET` optional in `functions/_lib/env.ts`
  (bearer path off when unset); not a production secret yet. No scheduler calls `/api/advance`.
- Observations attach to the field's latest non-review season, so one logged from an older
  season page lands on the current season and does not show there.
- No recommendations exist in the dataset and no UI creates them; approve/reject/complete only
  unit-tested. `/api/weather` has no UI caller.
- Reconcile-all does one archive fetch per season: watch the Workers subrequest limit (50) as
  seasons grow.
- Unhandled Sanity errors in Functions surface as the platform 500 (non-JSON).
- Documenter drift (report only): rain blue scale; planning/review stage greys; layer labels;
  older routes use `rounded-lg` controls (FieldExplorer, SeasonBoard, ScenarioSimulator, Login,
  Season), brand green in StageStepper and GddChart, round stage stepper.
- At 768-1279 px the east farms are hidden under the farm panel. Mobile attribution starts expanded.
- Prettier fails on 17 committed files (pre-existing). `favicon.ico` still old seedling.
- RegionMap chunk 1.04 MB. Front A11y / frontend-performance skills: awaiting user's source.
- Copy changes to tell user: hero H1, CTA wording, eyebrows removed.
