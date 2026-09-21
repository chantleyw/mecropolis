# Handoff (2026-09-21)

Read first: `CLAUDE.md` (traps). Plan of record: `~/.claude/plans/pasted-content-id-a957-c-users-user-pc-flickering-ember.md` (source doc: `~/Downloads/sanity-agronomy-challenge-implementation-plan.md`; ignore its "AI Football" wording).

## State

- Plan steps 0, 1 (roadmap 12) and 2 (roadmap 13) done. Step 2: schema `agronomyRecommendation`, `src/lib/recommendations/{machine,types,http}.ts`, routes under `src/app/api/recommendations`, dashboard `RecommendationQueue`. typegen rerun.
- Verified: typecheck, lint, 165 tests, build, audit 0, unauthenticated route calls return 401.
- **Not verified:** signed-in create, approve, reject, complete; invalid-transition 409 and revision-conflict 409 against live Sanity; the queue render in a browser. No route creates a recommendation from the UI yet (only the API).

## Next

Plan step 3 (roadmap 14): stage-change timeline from `stageHistory`, evidence drawer from `EvidenceRef[]`, readiness card from `src/lib/readiness`, benchmark card with per-source availability, on `src/app/(app)/seasons/[id]/page.tsx`. Then step 4 (agent) starts with a spike on Sanity Context, Knowledge Base beta and provider SDK; stop and report if assumptions differ.

## Open threads

- `planning/decisions.md` and README not updated for steps 12 and 13. Security division review not run.
- Stale-cache and slow-render thread from earlier: landing/dashboard use `unstable_cache` (30 min); causes unmeasured.
- Seed replaces farm, fields, crops; seasons use `createIfNotExists`. No CSP, no sign-in throttle, routes echo upstream errors, `FAS_API_KEY` in a query string, GDD parameters uncited. `weatherSnapshot.ts` fails `format:check`. No git remote.
