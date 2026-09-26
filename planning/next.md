# Handoff (2026-09-26)

Read first: `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`. Active plan: `~/.claude/plans/we-implement-1-7-no-smooth-flamingo.md` (Sanity depth round 2, features 1-7).

## State

Steps A-E done and deployed (https://mecropolis.pages.dev). Step F code done and the Blueprint stack deployed 2026-09-26:
`sanity-functions/` (org `otkq2yzwy`, stack `mecropolis` ST-66yupqvj2x) with `reconcile-on-observation`
(create, observation or non-reconcile weatherSnapshot, posts `{ seasonId }`) and `nightly-reconcile` (02:00 UTC, posts `{}`),
both to `https://mecropolis.pages.dev/api/advance` with `Bearer CRON_SECRET`. 6 handler tests. Bearer path checked on 8788
(single season and all seasons 200, wrong token rejected). `CRON_SECRET` is a Pages production secret.

## Next (F finish, user actions first)

1. User: `npm run deploy` (the auto-mode classifier blocked me); the Pages secret only applies to a new deployment.
2. User: `npx sanity functions env add reconcile-on-observation CRON_SECRET <value>` and the same for `nightly-reconcile` (run from `sanity-functions/`).
3. Then verify: create an observation in production, `../node_modules/.bin/sanity blueprints logs` in `sanity-functions/` shows a clean run; after 02:00 UTC check the nightly run.
4. User: delete the manage.sanity.io webhook; then decide to remove `/api/webhook/sanity` or leave it 404 (README table row says "being replaced").
5. Then G (Agent Actions summary; needs AI credits enabled).

Until step 2, every observation create makes the document function throw "CRON_SECRET is not set" (logs only; the webhook still reconciles).

## Open threads

- Scheduled functions are marked `@alpha` in `@sanity/blueprints` 0.27 ("not available publicly yet") but the deploy accepted it; confirm it actually fires.
- Security: public dataset lets anyone run `text::semanticSimilarity` anonymously and drain the embeddings quota; user decided 2026-09-26 to keep it public; after judging, disable embeddings or go private.
- Search cap is global (15/day shared by the demo login). Search dates shown as UTC.
- Recommendation drafts are not live; `/api/history` 404s for a draft-only recommendation.
- Reconcile-all: one archive fetch per season versus the 50-subrequest limit.
- Not verified in production: live refetch, PDF upload, propose/approve/reject, search, notes add/edit/delete/restore, zero-CSP check.
- User: make the GitHub repo public; decide on demo credentials in README.
- Unhandled Sanity errors in Functions surface as the platform 500. Design drift (report only). Prettier fails on 17 committed files. RegionMap 1.04 MB.
- Submission post: Western Cape framing and the rebuild story (see memory).
