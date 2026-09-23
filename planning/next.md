# Handoff (2026-09-23, night)

Read first: `CLAUDE.md`, `PRODUCT.md`. Active plan: `~/.claude/plans/alright-we-need-to-humming-clock.md`.
DESIGN.md is STALE; the world's contract is `.impeccable/surfaces/src-pages-landing-tsx.md`.

## State

Branch `master`, M3a and M3b (partial finish fixes) committed and pushed to origin; not deployed. Last full
run green: typecheck, lint, 197 tests, build, audit 0. Region grid backfilled to 2026-09-22.

Impeccable finish review ran (captures in `.impeccable/review/`: desktop, desktop-full, mobile,
mobile-full, about). Verdict **fix**, 8 material fixes; reviewer agent id `a42f703b6e8eb02ec`
(SendMessage it the recaptures for the verdict pass).

Fixes DONE (typecheck/lint/tests green, panel checked in browser):
- #3 farm panel: each season shows stored evidence `since <date> at <gdd> GDD · maturity at N GDD`
  (query adds `lastChange: stageHistory[-1]`, typegen run, `OverviewSeason.lastChange`); grid-point
  figure demoted to one integer line "Regional context, not a season total".
- #5 yield kicker removed (`YieldPanel.tsx`); #6 yield and crop-model bars now `--ink`.

Fixes TODO (one batch, then recapture with scratchpad-style Playwright script: `load` + 8 s wait,
wheel-scroll the full-page shots so lazy sections load; networkidle never settles):
1. Mobile: map first at ~62svh full-width (section `flex flex-col md:block`, order classes), layer
   switcher + legend as a compact card inside the map wrapper at its bottom; grid note under it.
2. `RegionMap.tsx`: compact `AttributionControl` (top-right on mobile), `NavigationControl` md+ only;
   pin labels placed by screen overlap (marker anchored on dot, label side/dy from React state
   recomputed on move/resize), never under attribution.
4. `padding().right` = 400 at >=1280 px so no cell sits under the farm panel.
7. Replace the black "Open a season" band with a white floating panel, or remove it.
8. Tooltip adds "Open-Meteo, 0.25° grid"; record in the brief why the legend sits bottom left
   (with its switcher; bottom right holds map controls).
Then: verdict pass, `impeccable-documenter` (replace DESIGN.md + `.impeccable/design.json`),
re-run detector, then commit M3b via `ship`.

## Open threads

- User asked to install "Front A11y" and "frontend-performance" skills: not in the skill or plugin
  catalog. Offered Design plugin (`design:accessibility-review`); awaiting user's source/URL.
  `/security-review` is built in; run it after M3b commit. Impeccable `audit` covers a11y/perf too.
- Prettier fails on 17 committed files untouched this session (pre-existing).
- Mobile Overberg/Ruens label overlap (fix #2). `favicon.ico` still old seedling.
- Bundle: RegionMap chunk 1.04 MB, index 617 kB. Write controls removed until M4.
- Copy changes to tell user: hero H1, CTA wording, eyebrows removed.
