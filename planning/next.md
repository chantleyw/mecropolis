# Handoff (2026-09-23, late night)

Read first: `CLAUDE.md`, `PRODUCT.md`. Active plan: `~/.claude/plans/alright-we-need-to-humming-clock.md`.
DESIGN.md is STALE; the world's contract is `.impeccable/surfaces/src-pages-landing-tsx.md`.

## State

Branch `master`. M3b finish fixes 1-8 all done and committed (not pushed, not deployed). Full run
green: typecheck, lint, 197 tests, build, audit 0. Recaptures in `.impeccable/review/` (desktop,
desktop-1024, desktop-full, mobile, mobile-full, about); capture script pattern: Playwright with
system Chrome + swiftshader, `load` + 8 s wait, wheel-scroll for full pages.

Map labels: `placeLabels` in `RegionMap.tsx` places each label greedily around its dot, avoiding
labels, dots, `.maplibregl-ctrl` and elements marked `data-map-cover` (the three Landing panels).

## Next

1. Impeccable verdict pass on the recaptures. The earlier reviewer (`a42f703b6e8eb02ec`) cannot be
   resumed from a new session; needs the user's go-ahead to spawn a new `impeccable-finish-reviewer`.
2. `impeccable-documenter` (replace DESIGN.md + `.impeccable/design.json`), re-run detector.
3. Then M4 (writes and workflow).

## Open threads

- Lazy routes, `"type": "module"` and the DEMO_SITE decisions row committed (e003fbf, 50d7e68).
  Untracked `.claude/`, `.impeccable/{mocks,questions,review}/` left out of git.
- Nothing pushed yet: master is 3 commits ahead of origin.
- Mobile attribution starts expanded (two lines at the map top) until first interaction (MapLibre
  default). 768-1279 px: farm panel still covers the east cells (accepted in fix #4).
- Prettier fails on 17 committed files (pre-existing). `favicon.ico` still old seedling.
- RegionMap chunk 1.04 MB. `/security-review` after M3b. Front A11y / frontend-performance skills:
  awaiting user's source.
- Copy changes to tell user: hero H1, CTA wording, eyebrows removed.
