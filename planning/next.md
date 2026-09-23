# Handoff (2026-09-23, late night)

Read first: `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`. Active plan: `~/.claude/plans/alright-we-need-to-humming-clock.md`.

## State

Branch `master`. M3b done (roadmap row 21): landing rebuilt as the regional weather-map field,
finish review verdict ship-with-fixes (both fixes resolved), DESIGN.md and `.impeccable/design.json`
rewritten by `impeccable-documenter` from the shipped build. `impeccable detect src`: 0 anti-patterns.
Direction contract: `.impeccable/surfaces/src-pages-landing-tsx.md`.

## Next

M4 (writes and workflow) from the active plan.

## Open threads

- Nothing pushed: master is ahead of origin. Untracked `.claude/`, `.impeccable/{mocks,questions,review}/` left out of git.
- Documenter drift (report only, not fixed): rain uses its own blue scale (recorded as the one
  exception); stage colours planning/review are greys, not ramp; layer labels "Max temperature",
  "Rain, 7 days" differ from the contract; older app routes still use `rounded-lg` controls
  (FieldExplorer, SeasonBoard, ScenarioSimulator, Login, Season), brand green in StageStepper and
  GddChart, a fully round stage stepper.
- At 768-1279 px the east farms (Overberg, Ruens) are hidden under the farm panel.
- Mobile attribution starts expanded until first interaction (MapLibre default).
- Prettier fails on 17 committed files (pre-existing). `favicon.ico` still old seedling.
- RegionMap chunk 1.04 MB. `/security-review` after M3b. Front A11y / frontend-performance skills:
  awaiting user's source.
- Copy changes to tell user: hero H1, CTA wording, eyebrows removed.
