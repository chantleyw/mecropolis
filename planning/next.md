# Handoff (2026-09-23)

Read first: `CLAUDE.md`. Active plan (only one): `~/.claude/plans/alright-we-need-to-humming-clock.md`
(Cloudflare Pages SPA + Pages Functions on a Sanity backend). It supersedes
`worth-noting-that-rendering-sequential-blanket.md` and `review-what-is-going-sparkling-allen.md`
(not yet marked superseded in those files; do in M6 docs pass).

## State

Branch `master`. Root cause of the deploy failure: `@sanity/sdk-react` user login goes through
`www.sanity.io/login`, which rejects non-Sanity origins, and judges are not project members.
Replaced by Pages Functions holding the write token + a published demo login.

User did (verified CORS header only): dataset `production` public; CORS 5173/8788/pages.dev
without credentials; new Editor token. Anonymous `count(*)` returns 0 (dataset likely empty).

Milestone 1 code written, uncommitted:
- `wrangler.toml` ([vars] project id/dataset), `functions/tsconfig.json`, wrangler + workers-types devDeps
- `functions/_lib/{env,crypto,session,http,sanity}.ts`, `functions/_lib/session.test.ts` (8 pass)
- `functions/api/session/{login,logout,me}.ts`, `functions/api/observations.ts`
- `src/lib/sanity/{client,useLiveQuery}.ts`, `src/lib/api.ts`, `src/App.tsx` (M1 gate page)
- `vite.config.ts` /api proxy to 8788; scripts `dev:api`, `deploy`, `typecheck` (app + functions)
- `scripts/seed.ts` now reads `VITE_SANITY_*`; `.gitignore` adds `.wrangler/`, `.dev.vars*`
- Plus the older uncommitted Cloudflare migration (`vercel.json` deleted, `public/_redirects`, docs).
Verified: typecheck, session tests, `wrangler pages functions build`. Not verified: runtime.

Deviation (reported to user): `DEMO_PASSWORD` plain secret with constant-time compare, not PBKDF2
(password is published anyway).

## Done 2026-09-23

- `.env.local` and Pages secrets set. Dataset re-keyed: dotted IDs (private sub-path docs) became
  dashed, 84 docs in one transaction, all refs and `stageHistory[].weatherSnapshotId` rewritten;
  seed and ID generators now use `-`. Backup: `../mecropolis-backups/backup-production-2026-09-23.ndjson`.
- Vite `/api` proxy now `changeOrigin: false` (shorthand rewrote Host, failing `sameOrigin`).
- M1 gate passed locally and on mecropolis.pages.dev (user signed in, logged an observation,
  saw it update live on the deploy URL too).

## Next

1. Commit M1 (ship skill), then Milestone 2 clean slate.

## Open threads

- Observation schema says "never typed by an operator"; update in M4.
- Deadline 2026-10-04 vs user "time isn't a factor".
- Repo visibility and LICENSE choice (M6).
