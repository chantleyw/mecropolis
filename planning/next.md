# Handoff (2026-09-26)

Read first: `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`. Active plan: `~/.claude/plans/we-implement-1-7-no-smooth-flamingo.md` (Sanity depth round 2, features 1-7).

## State

Steps A-E done and deployed (https://mecropolis.pages.dev). Step F code done and the Blueprint stack deployed 2026-09-26:
`sanity-functions/` (org `otkq2yzwy`, stack `mecropolis` ST-66yupqvj2x) with `reconcile-on-observation`
(create, observation or non-reconcile weatherSnapshot, posts `{ seasonId }`) and `nightly-reconcile` (02:00 UTC, posts `{}`),
both to `https://mecropolis.pages.dev/api/advance` with `Bearer CRON_SECRET`. 6 handler tests. Bearer path checked on 8788
(single season and all seasons 200, wrong token rejected). `CRON_SECRET` is a Pages production secret.

## Next (F finish)

Done 2026-09-26: Pages redeployed with `CRON_SECRET`; secret set on both functions (`functions env list` shows it);
production bearer call to `/api/advance` returned 200 (season-north-a-2026 unchanged).

1. Document function fired 2026-09-26 14:29:44 UTC, 1 s after a real observation on season-ob-hill-2026; log shows only "invocation started", no error (the handler throws on failure but logs nothing on success, so success is inferred).
2. After 02:00 UTC check `functions logs nightly-reconcile`.
3. User: delete the manage.sanity.io webhook; then remove `/api/webhook/sanity` or leave it 404 (README row says "being replaced").
4. Then G (Agent Actions summary; needs AI credits enabled).

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
