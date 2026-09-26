# Handoff (2026-09-26)

Read first: `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`. Plan `~/.claude/plans/we-implement-1-7-no-smooth-flamingo.md` (Sanity features 1-7) is complete.

## State

All steps A-G deployed to https://mecropolis.pages.dev and pushed (master = origin, fad3c93+). Since G:
- `/api/summary` summarises seasons with no records too (5f71149); user verified in production.
- `reconcile-on-observation` also fires on `treatment` create (85a4366); blueprint deployed by the user.
- `nightly-reconcile` verified firing (hourly test 16:00 UTC, reverted to `0 2 * * *` and redeployed).
306 tests, lint, typecheck, build, audit 0.

## Next

1. Medium fixes deployed and checked by the user 2026-09-26. Low items in `planning/review-2026-09-26.md` remain.
2. Test the treatment trigger: add a treatment, check `reconcile-on-observation` logs.
3. Submission post and screenshots (Western Cape framing, rebuild story; see memory).

## Open threads

- Security (Low): treatment trigger doubles demo-driven reconciles to ~120/h (Functions quota not checked); bearer callers share one "scheduler" limiter key (20/min per isolate), bursts 429 and the function throws. Summary: any demo user can use the shared 25/day cap.
- Security: public dataset lets anyone run `text::semanticSimilarity` and drain embeddings quota; kept public by user decision; after judging, disable embeddings or go private.
- `aiSummary` in schema file but `sanity schema deploy` not run.
- Summary uses stored `gddTotal` only, not running GDD. Search cap global (15/day); dates UTC.
- Recommendation drafts not live; `/api/history` 404s for draft-only recommendations.
- Reconcile-all: one archive fetch per season vs the 50-subrequest limit.
- Not verified in production: live refetch, PDF upload, propose/approve/reject, search, notes add/edit/delete/restore, zero-CSP check.
- User: make the GitHub repo public; decide on demo credentials in README.
- Unhandled Sanity errors in Functions surface as platform 500. Design drift (report only). Prettier fails on 26 files. RegionMap 1.04 MB.
