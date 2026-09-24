# Handoff (2026-09-24)

Read first: `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`. Active plan: `~/.claude/plans/we-implement-1-7-no-smooth-flamingo.md` (Sanity depth round 2, features 1-7).
Previous plan (`alright-we-need-to-humming-clock.md`) is complete apart from the user items below.

## State

Branch `master`. M6 committed (not pushed) and deployed to https://mecropolis.pages.dev with the CSP in
`public/_headers`. All plan milestones built. Check the CSP locally with the `dist` launch config
(`wrangler pages dev dist --port 8788`; other ports fail Sanity CORS).

## Next

- User: make https://github.com/chantleyw/mecropolis public; decide whether the demo credentials go in the README
  (values are secrets I do not handle); push so CI runs for the first time.
- Submission post: Western Cape framing and the mid-project rebuild story (see memory).
- Open a production route in a browser and confirm zero CSP violations (the browser pane blocks the site).

- New plan: step A (notes restore, `POST /api/notes/restore`) done 2026-09-24, not deployed. Next: step B
  (Live Content API). Order A-G is in the plan file.

## Open threads

- `CRON_SECRET` not a production secret; no scheduler.
- Photo upload works in production (user, 2026-09-24). Notes save not exercised in production.
- Notes restore 200 path not exercised (only 404/409 against the real History API); the only season with a
  notes change has nothing older to restore without rewriting its real notes.
- Notes have per-IP limit only. Photo uploads: global 20/h.
- Observations attach to the field's latest non-review season.
- No recommendations exist and no UI creates them. `/api/weather` has no UI caller.
- Reconcile-all does one archive fetch per season (Workers 50-subrequest limit).
- Unhandled Sanity errors in Functions surface as the platform 500 (non-JSON).
- Design drift (report only): older routes use `rounded-lg`, brand green in StageStepper and GddChart; at 768-1279 px east farms hide under the farm panel.
- Prettier fails on 17 committed files (CI skips `format:check`). `favicon.ico` old seedling. RegionMap 1.04 MB.
- Copy changes to tell user: hero H1, CTA wording, eyebrows removed.
