# Handoff (2026-09-21)

Read the approved plan first: `~/.claude/plans/review-the-planning-doc-melodic-book.md`. Spec: `planning.txt`. Conventions and traps: `CLAUDE.md`.

## State

- Phases 0 to 3 done. Typecheck, lint, format, 30 unit tests pass; `npm audit` 0.
- Workflow: `src/lib/workflow/{types,machine,guards}.ts` (pure), `src/lib/rateLimit.ts`, `src/app/api/transition/route.ts`, `src/lib/sanity/writeClient.ts` (only user of the write token).
- Decisions: no ownership check (single-tenant demo); rate limit is per-instance in-memory, best-effort. `pre-harvest -> growing` requires notes. Route writes stage + history entry in one transaction guarded by `ifRevisionId` (409 on conflict); no weather effect yet, `weatherSnapshot: null`.
- Verified (prod build, dummy env): unauth 401, non-JSON 400, bad stage 400, 21st request 429.
- User must set in `.env.local`: `AUTH_DEMO_USER`, `AUTH_DEMO_PASSWORD_HASH`, `SANITY_WEBHOOK_SECRET`, real Sanity vars and token. `npm run build` fails without them.

## Next

- Phase 4: `fetchJson`, Open-Meteo (archive vs forecast variables), climate outlook, SoilGrids/GBIF/World Bank, wire effects into the transition (run effect first, then commit snapshot + history together), `GET /api/weather`, `POST /api/webhook/sanity`.

## Open threads

- Not verified: transition against real Sanity (Season C `planning -> planted` checkpoint), browser sign-in form, Studio reference resolution, real `.env.local`.
- Typegen not wired into build. Dataset public/private undecided.
- Optional real data wanted: 2025 wheat yield, real treatments.
