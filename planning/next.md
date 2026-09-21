# Handoff (2026-09-21)

Read the approved plan first: `~/.claude/plans/review-the-planning-doc-melodic-book.md`. Spec: `planning.txt`. Conventions and traps: `CLAUDE.md`.

## State

- Phases 0 to 4 done. Typecheck, lint, 67 unit tests pass; `npm audit` 0; `npm run build` passes with the real `.env.local`.
- Phase 4: `src/lib/{http,weather,data,webhook}`, `workflow/effects.ts`, `GET /api/weather`, `POST /api/webhook/sanity`. Transition runs the weather effect first, then commits snapshot + history + `expectedHarvest` in one transaction; a failed fetch gives `weatherFetched: false` plus `weatherError` in the response.
- Verified: live Open-Meteo (forecast, archive 241.3 mm / 455.06 ET0, climate), SoilGrids, GBIF, World Bank parse; forged/unsigned webhook 401; correctly signed webhook reaches real Sanity (404 for unknown id); unauth `/api/weather` 401.
- Decisions: no ownership check; in-memory rate limit; climate projections omit ET0 and soil (API returns nulls); snapshot `data` is the normalised series.

## Next

- Phase 5: `scripts/seed.ts` (deterministic ids, idempotent, real weather and soil at seed time, no fabricated treatments or yields), then placeholder frontend (farm overview, field detail timeline, workflow page, pest report Server Action).

## Open threads

- Not verified: Season B transition writing a real snapshot (needs seed data); Sanity dashboard webhook (filter `_type == "pestReport" && severity in ["high","critical"]`, trigger Create, projection `{_id}`, secret = `SANITY_WEBHOOK_SECRET`, URL `/api/webhook/sanity`); browser sign-in; Studio reference resolution.
- Typegen not wired into build. Dataset public/private undecided.
- GBIF and World Bank wrappers are not yet used by any route (seed/UI will).
- Optional real data wanted: 2025 wheat yield, real treatments.
