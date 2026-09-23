# Handoff (2026-09-23, night)

Read first: `CLAUDE.md`, `PRODUCT.md`. Active plan: `~/.claude/plans/alright-we-need-to-humming-clock.md`.
DESIGN.md is STALE; the world's contract is `.impeccable/surfaces/src-pages-landing-tsx.md`.

## State

Branch `master`. M3b verdict pass done (reviewer `a953c4333da91390a`): ship-with-fixes, two label
fixes, both applied and verified in recaptures (`.impeccable/review/`, 1440, 1024, 375):
- `placeLabels` (`RegionMap.tsx`) hides a pin whose dot is under a cover, and hides a label that
  cannot sit fully clear of covers and the map edge (no clipped fragments at 1024).
- `coveredPlaces` queries basemap `place` symbol layers under each farm dot/label and drops those
  names via a layer filter (keeps a name hidden while within 160 px, to stop flicker).
Full run green: typecheck, lint, 197 tests, build, audit 0. Capture script: Playwright with system
Chrome + swiftshader, `load` + 8 s wait (copy in session scratchpad `capture.mjs`).

## Next

1. `impeccable-documenter` (replace DESIGN.md + `.impeccable/design.json`), re-run detector. User
   held this until they had seen the verdict; ask before spawning.
2. Then M4 (writes and workflow).

## Open threads

- Nothing pushed yet: master is ahead of origin. Untracked `.claude/`, `.impeccable/{mocks,questions,review}/` left out of git.
- At 768-1279 px the east farms (Overberg, Ruens) are hidden under the farm panel; only Swartland shows.
- Mobile attribution starts expanded until first interaction (MapLibre default).
- Prettier fails on 17 committed files (pre-existing). `favicon.ico` still old seedling.
- RegionMap chunk 1.04 MB. `/security-review` after M3b. Front A11y / frontend-performance skills:
  awaiting user's source.
- Copy changes to tell user: hero H1, CTA wording, eyebrows removed.
