# Handoff (2026-09-26)

Read first: `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`. Active plan: `~/.claude/plans/we-implement-1-7-no-smooth-flamingo.md` (Sanity depth round 2, features 1-7).

## State

Branch `master`, not pushed. Step A deployed 2026-09-24. Steps B (Live Content API), C (soil PDF asset),
D (recommendations as Actions API drafts) and E (Dataset Embeddings search) done locally, not deployed.
Step E: embeddings enabled on `production` (projection: observation `notes`, treatment `product, notes`;
status ready). `GET /api/search?q=&farm=` (session, 15/day global via `rate-search-queries` counter doc)
feeds the farm dashboard "Search records" section. Real search checked on 8788 (Overberg, "rocks in the soil"
found the stone notes); response took ~8 s.

## Next

- Step F (Sanity Functions + Blueprints): needs the user for org-scoped stack and `CRON_SECRET` in Pages and Function env. Then G (Agent Actions summary; needs AI credits enabled).
- Deploy B-E: `npm run deploy` (user).
- Not verified: D real propose/approve/reject; C real PDF upload; B refetch after a real mutation.
- Notes add/edit/delete/restore not yet tried in production.
- User: make the GitHub repo public; decide on demo credentials in README; push so CI runs.
- Submission post: Western Cape framing and the rebuild story (see memory).

## Open threads

- Security: the dataset is public-read, so anyone can run `text::semanticSimilarity` queries against it anonymously and drain the org embeddings quota; the app cap only covers `/api/search`. Only fix is a private dataset: all browser loaders and Live Content API move behind Functions (1-2 days); user decided 2026-09-26 to keep it public; after judging, disable embeddings or go private.
- Search cap is global: one person with the published demo login can use all 15/day in ~2 min (per-IP 10/min), blocking search for everyone for 24 h. Per-user caps do not help while everyone shares the demo account.
- Search dates are shown as UTC calendar dates (observation near SAST midnight shows the previous day).
- Recommendation drafts are not live; `/api/history` 404s for a draft-only recommendation.
- `CRON_SECRET` not a production secret; no scheduler. Reconcile-all one archive fetch per season (50-subrequest limit).
- Unhandled Sanity errors in Functions surface as the platform 500 (non-JSON).
- Design drift (report only): `rounded-lg` on older routes, brand green in StageStepper/GddChart, farm panel covers east farms at 768-1279 px.
- Prettier fails on 17 committed files (CI skips `format:check`). `favicon.ico` old seedling. RegionMap 1.04 MB.
- Also open: pre-ownership deleted notes cannot be restored; `/api/weather` has no UI caller; production CSP check pending; tell user about copy changes (hero H1, CTA, eyebrows).
