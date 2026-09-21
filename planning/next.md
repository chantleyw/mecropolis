# Handoff (2026-09-21)

Read the approved plan first: `~/.claude/plans/review-the-planning-doc-melodic-book.md`. Spec: `planning.txt`. Conventions and traps: `CLAUDE.md`.

## State

- Phases 0, 1 and 2 done. Build, lint, typecheck pass; `npm audit` 0.
- Auth: `next-auth@beta` (v5) in `src/auth.ts` (credentials, bcryptjs hash, JWT session with display name only), `src/proxy.ts` gate (Next 16 name for middleware; `/api/*` gets 401 JSON, pages redirect to `/signin`), `src/app/signin/page.tsx`. Public: `/signin`, `/api/auth/*`, `/api/webhook/*`, static.
- User must set in `.env.local`: `AUTH_DEMO_USER`, `AUTH_DEMO_PASSWORD_HASH` (from `node scripts/hash-password.mjs '<pw>'`), plus the still-empty Sanity vars and `AUTH_SECRET`.
- Verified (prod build, dummy env): signed-out `/` 307 to `/signin`, `POST /api/transition` 401, bad login rejected, good login gives session `{name}`, `/` 200 signed in.
- `npm test` exits 1 (no tests until Phase 3). `/` is still the Next starter page (Phase 5).

## Next

- Phase 3: workflow engine (`machine.ts`, `guards.ts`, `types.ts`), unit tests first, then `POST /api/transition`. Route handlers must call `auth()` themselves (proxy is optimistic only).

## Open threads

- Not verified: browser-rendered sign-in form (curl only); real `.env.local` values.
- Not verified: creating a doc by hand and resolving references in Studio.
- Typegen not wired into build. Dataset public/private undecided.
- Optional real data still wanted: 2025 wheat yield, real treatments.
