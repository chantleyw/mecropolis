# Handoff (2026-09-21)

Read the approved plan first: `~/.claude/plans/review-the-planning-doc-melodic-book.md`. Spec: `planning.txt`. Conventions and traps: `CLAUDE.md`.

## State
- Phases 0 and 1 done and committed. Build, lint, typecheck pass; `npm audit` 0 (npm `overrides` in package.json for sanity CLI transitive deps; re-check after upgrading sanity).
- 8 schemas in `sanity/schemaTypes/`, Studio at `/studio` (client wrapper `Studio.tsx`), `sanity/types.ts` generated. Studio confirmed loading by user.
- `npm test` exits 1 (no tests until Phase 3). `/` is still the Next starter page (Phase 5).
- `src/lib/publicEnv.ts` holds NEXT_PUBLIC vars for client code; `env.ts` stays server-only.

## Next
- Phase 2: Auth.js v5 credentials provider, published demo account, bcrypt/argon2 hash in env, sign-in page, middleware, gate everything. Needs new env vars (`AUTH_DEMO_USER`, hash) added to `.env.example`; user sets values in `.env.local`.

## Open threads
- Not verified: creating a doc by hand and resolving references in Studio.
- Typegen not wired into build (Sanity CLI ignores `.env.local`).
- Optional real data still wanted: 2025 wheat yield, real treatments. Dataset public or private still undecided (stageHistory stores display name only).
