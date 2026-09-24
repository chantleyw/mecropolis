# Handoff (2026-09-24)

Read first: `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`. Active plan: `~/.claude/plans/we-implement-1-7-no-smooth-flamingo.md` (Sanity depth round 2, features 1-7).

## State

Branch `master`, not pushed. Step A (separate notes, per-note restore) done; note ownership done: notes store
`ownerId` (session user); only the owner may edit, delete or restore (`ownsNote` in `src/lib/notes.ts`, 403 in
`functions/api/notes.ts` and `notes/restore.ts`; history offers Restore only on own notes; UI hides Edit/Delete).
A note without `ownerId` belongs to no one. Local `dist` server on 8788 rebuilt with this.

## Next

- User approval needed: `npm run migrate:owners -- --write` sets `ownerId` = DEMO_USER on the 2 existing notes
  (dry run lists `season-north-a-2026`, `season-south-b-2026`). Until then those notes show no Edit/Delete.
- Deploy soon (`npm run deploy`): live site still runs the old notes UI against the new data shape.
- Then step B (Live Content API). Order A-G is in the plan file.
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
- Design drift (report only): older routes use `rounded-lg`, brand green in StageStepper and GddChart; at 768-1279 px east farms hide under the farm panel.
- Prettier fails on 17 committed files (CI skips `format:check`). `favicon.ico` old seedling. RegionMap 1.04 MB.
- Copy changes to tell user: hero H1, CTA wording, eyebrows removed.
