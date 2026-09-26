# Handoff (2026-09-26)

Read first: `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`. Active plan: `~/.claude/plans/we-implement-1-7-no-smooth-flamingo.md` (Sanity depth round 2, features 1-7).

## State

Steps A-G deployed (https://mecropolis.pages.dev, G deployed 2026-09-26 as cb0b92e, pushed through 4d86ca5; 5f71149 lets empty seasons be summarised, deployed and pushed through 6ef5a74); webhook retired. Step G:
`POST /api/summary` (Agent Actions Prompt on API `vX`, global caps 10/h and 25/day via `functions/_lib/counter.ts`
`reserveCall`, now shared with search) writes `season.aiSummary`; "Season summary" section on the season page.
Live-checked on 8788/5173: one real call on season-ob-hill-2026 returned 200, summary stored and shown
via the live listener (1 AI credit spent). 304 tests, lint, typecheck, build, audit 0.

## Next

1. Test the treatment trigger (deployed 2026-09-26): add a treatment, check `reconcile-on-observation` logs.
2. Plan features 1-7 then complete; remaining work is the submission (post, screenshots).

## Open threads

- `aiSummary` added to the schema file but `sanity schema deploy` not run (Prompt needs no schemaId; no Studio). Run it if deployed-schema consumers matter.
- Summary counts only stored `gddTotal` from stage changes, not the browser-computed running GDD.
- nightly-reconcile verified firing (hourly test at 16:00 UTC 2026-09-26, then reverted to 02:00). Its logs show only in the Sanity dashboard; `sanity functions logs nightly-reconcile` returns none.
- Security: public dataset lets anyone run `text::semanticSimilarity` anonymously and drain embeddings quota; kept public by user decision 2026-09-26; after judging, disable embeddings or go private.
- Search cap is global (15/day shared by the demo login). Search dates shown as UTC.
- Recommendation drafts are not live; `/api/history` 404s for a draft-only recommendation.
- Reconcile-all: one archive fetch per season versus the 50-subrequest limit.
- Not verified in production: live refetch, PDF upload, propose/approve/reject, search, notes add/edit/delete/restore, zero-CSP check. Summary verified in production by the user 2026-09-26 (empty season).
- User: make the GitHub repo public; decide on demo credentials in README.
- Unhandled Sanity errors in Functions surface as the platform 500. Design drift (report only). Prettier fails on 17 committed files. RegionMap 1.04 MB.
- Submission post: Western Cape framing and the rebuild story (see memory).
