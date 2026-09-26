# Handoff (2026-09-26)

Read first: `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`. Active plan: `~/.claude/plans/we-implement-1-7-no-smooth-flamingo.md` (Sanity depth round 2, features 1-7).

## State

Branch `master`, not pushed. Step A (notes restore + per-account ownership) done and deployed 2026-09-24.
Step B (Live Content API) done locally: `useLive(load, params)` subscribes to `sanity.live.events()`;
loaders get a client whose `fetch` uses `filterResponse: false` to collect sync tags; a `message` event
naming one reruns the loader with `lastLiveEventId`, `restart` reruns, `welcome` sets live. Filters
and `sanityFresh` removed. On `wrangler pages dev dist` (8788) the landing shows "Live", zero console/CSP
errors. Not deployed.

## Next

- Step C (soil test PDF) done: `/api/assets?kind=soilReport`, `field.soilReport` file asset, "Soil test
  report" section on the season page; schema deployed. Rejections (415/400) checked on 8788; a real PDF
  upload not run (no real soil report to hand). Not deployed: `npm run deploy` is refused by the
  permission classifier in autonomous mode; the user deploys.
- Step B not verified: a view refetching after a real mutation (needs a real write).
- Then step D (recommendations as drafts via the Actions API). Order A-G is in the plan file.
- Notes add/edit/delete/restore not yet tried in production.
- User: make the GitHub repo public; decide on demo credentials in README; push so CI runs.
- Submission post: Western Cape framing and the mid-project rebuild story (see memory).
- Confirm zero CSP violations on a production route (the browser pane blocks the site).

## Open threads

- A note deleted before ownership has no owner in any revision, so it cannot be restored.
- Owned-note edit/delete/restore paths are unit-tested only; the 403 path was checked on the real dataset.
- Note writes: global 60/h (`rate-note-writes`); success path not run on real data. Photo uploads 20/h.
- `CRON_SECRET` not a production secret; no scheduler.
- Observations attach to the field's latest non-review season. No recommendations exist and no UI creates them. `/api/weather` has no UI caller.
- Reconcile-all does one archive fetch per season (Workers 50-subrequest limit).
- Unhandled Sanity errors in Functions surface as the platform 500 (non-JSON).
- Design drift (report only): `rounded-lg` on older routes, brand green in StageStepper/GddChart, farm panel covers east farms at 768-1279 px.
- Prettier fails on 17 committed files (CI skips `format:check`). `favicon.ico` old seedling. RegionMap 1.04 MB.
- Copy changes to tell user: hero H1, CTA wording, eyebrows removed.
