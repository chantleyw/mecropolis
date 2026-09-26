# Handoff (2026-09-26)

Read first: `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`. Plan `~/.claude/plans/we-implement-1-7-no-smooth-flamingo.md` (Sanity features 1-7) is complete.

## State

Production (https://mecropolis.pages.dev) runs the medium fixes. Committed since, NOT deployed, NOT pushed:
- Low fixes from `planning/review-2026-09-26.md`, one commit each (2d86b77..659cb35): impossible dates rejected,
  region lastError double failure named, pests batch trimmed to the hourly cap, sign-out error shown, scenario
  inputs accept negatives, RegionMap light colours, README trigger list. Plus security headers (6559f6b).
- Sanity functions: 404 from `/api/advance` skipped (review seasons), errors carry status only. Needs
  `sanity blueprints deploy` (see CLAUDE.md trap).
313 tests, lint, typecheck, build, audit 0.

## Next

1. User: `npm run deploy` (the auto-mode classifier blocked it), redeploy the blueprint, push.
2. Test the treatment trigger: add a treatment, check `reconcile-on-observation` logs.
3. Submission post and screenshots (Western Cape framing, rebuild story; see memory).

## Open threads

- Not verified in the browser: scenario negative input (pane did not take focus), RegionMap dark-mode colours.
- Review Lows left: token role note in `references/environment.md` (needs the user); no global Open-Meteo cap
  on `/api/advance`/`scenario`/`weather`; stateless logout; `migrate-notes.ts` limit=50 (one-off, skipped).
- Security (Low): treatment trigger doubles demo-driven reconciles to ~120/h; bearer callers share one
  "scheduler" limiter key (20/min per isolate). Summary: any demo user can use the shared 25/day cap.
- Security: public dataset lets anyone run `text::semanticSimilarity` and drain embeddings quota; after
  judging, disable embeddings or go private.
- `aiSummary` in schema file but `sanity schema deploy` not run.
- Summary uses stored `gddTotal` only. Search cap global (15/day); dates UTC.
- Recommendation drafts not live; `/api/history` 404s for draft-only recommendations.
- Reconcile-all: one archive fetch per season vs the 50-subrequest limit.
- Not verified in production: live refetch, PDF upload, propose/approve/reject, search, notes, zero-CSP check.
- User: make the GitHub repo public; decide on demo credentials in README.
- Unhandled Sanity errors in Functions surface as platform 500. Prettier fails on 26 files. RegionMap 1.04 MB.
