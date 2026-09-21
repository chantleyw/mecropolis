# Handoff (2026-09-21)

Read first: `CLAUDE.md` (traps). Plan of record: `~/.claude/plans/pasted-content-id-a957-c-users-user-pc-flickering-ember.md` (ignore its "AI Football" wording).

## State

- Plan steps 0-3 done (roadmap 12-14). Step 3: season page (`src/app/(app)/seasons/[id]/page.tsx`) now has a Decision readiness card (`ReadinessCard`), a collapsible Evidence list (`EvidenceList`), snapshot id in the timeline, and "contextual, not a field yield prediction" benchmark wording. `loadSeason` also returns `_rev`, `fieldId`, `benchmarkResolved`, `weatherSnapshotId`.
- Verified: typecheck, lint, 165 tests, build.
- **Not verified:** signed-in render of the season page; signed-in recommendation create, approve, reject, complete; 409 paths against live Sanity. No UI creates a recommendation yet (API only).

## Next

Plan step 4 (roadmap 15, agent): start with a spike on Sanity Context, Knowledge Base beta and provider SDK; stop and report if assumptions differ.

## Open threads

- Step 3 gaps: timeline threshold (not stored in `stageHistory`); per-source benchmark availability (unavailable sources not listed); evidence is an inline list, not a drawer; dashboard readiness not added.
- `planning/decisions.md` and README not updated for steps 12-14. Security division review not run.
- Stale-cache and slow-render thread: landing/dashboard use `unstable_cache` (30 min); causes unmeasured.
- Seed replaces farm, fields, crops; seasons use `createIfNotExists`. No CSP, no sign-in throttle, routes echo upstream errors, `FAS_API_KEY` in a query string, GDD parameters uncited. `format:check` fails on 8 pre-existing files. No git remote.
