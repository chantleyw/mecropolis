# Handoff (2026-09-26)

Read first: `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`. Active plan: `~/.claude/plans/we-implement-1-7-no-smooth-flamingo.md` (Sanity depth round 2, features 1-7).

## State

Steps A-F deployed (https://mecropolis.pages.dev); webhook retired. Step G done locally, not deployed:
`POST /api/summary` (Agent Actions Prompt on API `vX`, global 10/h cap via `functions/_lib/counter.ts`
`reserveCall`, now shared with search) writes `season.aiSummary`; "Season summary" section on the season page.
Live-checked on 8788/5173: one real call on season-ob-hill-2026 returned 200, summary stored and shown
via the live listener (1 AI credit spent). 304 tests, lint, typecheck, build, audit 0.

## Next

1. Deploy G: `npm run deploy`, then generate one summary in production.
2. After 02:00 UTC 2026-09-27: `sanity functions logs nightly-reconcile` (from `sanity-functions/`, local bin). No logs at 14:36 UTC 09-26 (expected).
3. Plan features 1-7 then complete; remaining work is the submission (post, screenshots).

## Open threads

- `aiSummary` added to the schema file but `sanity schema deploy` not run (Prompt needs no schemaId; no Studio). Run it if deployed-schema consumers matter.
- Cap 10/h allows up to 7,200 credits a month against the Free 1,000; the org pauses AI at the allowance (no charge unless the spending limit is raised), which would also stop other AI use. Consider a daily cap.
- Summary counts only stored `gddTotal` from stage changes, not the browser-computed running GDD.
- Scheduled functions are `@alpha` in `@sanity/blueprints` 0.27; confirm nightly fires.
- Security: public dataset lets anyone run `text::semanticSimilarity` anonymously and drain embeddings quota; kept public by user decision 2026-09-26; after judging, disable embeddings or go private.
- Search cap is global (15/day shared by the demo login). Search dates shown as UTC.
- Recommendation drafts are not live; `/api/history` 404s for a draft-only recommendation.
- Reconcile-all: one archive fetch per season versus the 50-subrequest limit.
- Not verified in production: live refetch, PDF upload, propose/approve/reject, search, notes add/edit/delete/restore, summary, zero-CSP check.
- User: make the GitHub repo public; decide on demo credentials in README.
- Unhandled Sanity errors in Functions surface as the platform 500. Design drift (report only). Prettier fails on 17 committed files. RegionMap 1.04 MB.
- Submission post: Western Cape framing and the rebuild story (see memory).
