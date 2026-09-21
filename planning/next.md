# Handoff (2026-09-21)

Read first: `CLAUDE.md` (traps). Plan of record: `~/.claude/plans/pasted-content-id-a957-c-users-user-pc-flickering-ember.md` (ignore its "AI Football" wording).

## State

- Plan steps 0-3 done (roadmap 12-14). Step 3: season page (`src/app/(app)/seasons/[id]/page.tsx`) now has a Decision readiness card (`ReadinessCard`), a collapsible Evidence list (`EvidenceList`), snapshot id in the timeline, and "contextual, not a field yield prediction" benchmark wording. `loadSeason` also returns `_rev`, `fieldId`, `benchmarkResolved`, `weatherSnapshotId`.
- Verified: typecheck, lint, 165 tests, build.
- **Not verified:** signed-in render of the season page; signed-in recommendation create, approve, reject, complete; 409 paths against live Sanity. No UI creates a recommendation yet (API only).

## Next

Plan step 4 (roadmap 15) is blocked after the docs spike. Docs confirm: Context MCP has GROQ and Knowledge Base modes (`groq_query`, `initial_context` tools; KB via `mode=knowledge_base&knowledgeBases=kb...`); dataset source needs `sanity schema deploy`; KB is opt-in beta; auth is an **organization** API token with Context Viewer (not a project token), server-side only; clients: Vercel AI SDK, OpenAI Agents SDK, LangChain. Needed from the user: (1) model provider; (2) confirm Context is enabled for the org and KB beta opted in; (3) org token in .env.local (never in chat). Not verified: account access. Then add env vars, deploy schema, build `src/lib/agent`.

## Open threads

- Step 3 gaps: timeline threshold (not stored in `stageHistory`); per-source benchmark availability (unavailable sources not listed); evidence is an inline list, not a drawer; dashboard readiness not added.
- `planning/decisions.md` and README not updated for steps 12-14. Security division review not run.
- Stale-cache and slow-render thread: landing/dashboard use `unstable_cache` (30 min); causes unmeasured.
- Seed replaces farm, fields, crops; seasons use `createIfNotExists`. No CSP, no sign-in throttle, routes echo upstream errors, `FAS_API_KEY` in a query string, GDD parameters uncited. `format:check` fails on 8 pre-existing files. No git remote.
