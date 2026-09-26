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

- Step D (recommendations as drafts) done locally: `POST /api/recommendations` creates `drafts.<id>` via
  the Actions API; `GET /api/recommendations?farm=` reads proposed drafts (token, drafts perspective);
  approve/reject publish the draft then patch status with `ifRevisionId` = publish transaction id
  (`_rev` equals the last transaction id: checked on real seasons). Propose form on the season page,
  approve/reject/complete in the farm queue. Actions API create, create+publish and the 409/404 error
  codes checked with `dryRun` on the real dataset (nothing written). On 8788: GET 200/400/401, form
  validation. Not verified: a real propose, approve and reject (would write a real recommendation;
  user to try or approve). Not deployed.
- Steps B-D deploy: `npm run deploy` (user; refused by the classifier in autonomous mode).
- Step C: a real PDF upload not run. Step B: a view refetching after a real mutation not run.
- Then step E (Dataset Embeddings; needs `sanity datasets embeddings enable`, user approval). Order in the plan file.
- Notes add/edit/delete/restore not yet tried in production.
- User: make the GitHub repo public; decide on demo credentials in README; push so CI runs.
- Submission post: Western Cape framing and the mid-project rebuild story (see memory).
- Confirm zero CSP violations on a production route (the browser pane blocks the site).

## Open threads

- A note deleted before ownership has no owner in any revision, so it cannot be restored.
- Owned-note edit/delete/restore paths are unit-tested only; the 403 path was checked on the real dataset.
- Note writes: global 60/h (`rate-note-writes`); success path not run on real data. Photo uploads 20/h.
- `CRON_SECRET` not a production secret; no scheduler.
- Observations attach to the field's latest non-review season. `/api/weather` has no UI caller.
- Recommendation drafts are not live (Live Content API is anonymous); the queue rereads them after a review only.
- `/api/history` returns 404 for a draft-only recommendation (reads the published type).
- Reconcile-all does one archive fetch per season (Workers 50-subrequest limit).
- Unhandled Sanity errors in Functions surface as the platform 500 (non-JSON).
- Design drift (report only): `rounded-lg` on older routes, brand green in StageStepper/GddChart, farm panel covers east farms at 768-1279 px.
- Prettier fails on 17 committed files (CI skips `format:check`). `favicon.ico` old seedling. RegionMap 1.04 MB.
- Copy changes to tell user: hero H1, CTA wording, eyebrows removed.
