# Handoff (2026-09-21)

Read first: `CLAUDE.md` (traps). Plan of record: `~/.claude/plans/pasted-content-id-a957-c-users-user-pc-flickering-ember.md` (ignore its "AI Football" wording).

## State

- Plan steps 0-3 done (roadmap 12-14). Step 4 (agent) skipped by the user: no Sanity Context or Knowledge Base access. Docs spike notes: Context MCP needs an org token (Context Viewer) and `sanity schema deploy`; KB is opt-in beta.
- Step 6 first half done (roadmap 17): `src/lib/agronomy/scenario.ts` (+ tests), `POST /api/scenario` (auth, zod, rate limit, nothing written), `ScenarioSimulator` under "What if?" on the season page.
- Verified: typecheck, lint, 169 tests, build.
- **Not verified:** signed-in render of the season page and scenario run; signed-in recommendation create/approve/reject/complete and 409 paths against live Sanity.

## Next

Either roadmap 16 (Sanity App SDK control room in `sanity-app/`; may need the same Sanity org access, check first) or the rest of step 6: demo dataset state, screenshots, DEV posts. Submission due 2026-10-04.

## Open threads

- Step 3 gaps: timeline threshold not stored; per-source benchmark availability not listed; evidence is an inline list, not a drawer.
- `planning/decisions.md` and README not updated for steps 12-14 and the scenario simulator. Security division review not run.
- Stale-cache and slow-render thread: `unstable_cache` (30 min); causes unmeasured.
- Seed replaces farm, fields, crops. No CSP, no sign-in throttle, routes echo upstream errors, `FAS_API_KEY` in a query string, GDD parameters uncited. `format:check` fails on 8 pre-existing files. No git remote.
