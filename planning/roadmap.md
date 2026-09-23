# Roadmap

Adopted design (plan file `~/.claude/plans/pasted-content-id-60a5-production-suppl-scalable-lobster.md`, "ADOPTED DESIGN").

| Step | Scope                                                                         | Status                                                                                             |
| ---- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1    | Agronomy: GDD and crop model                                                  | Done                                                                                               |
| 2    | Guards rewrite                                                                | Done                                                                                               |
| 3    | Reconciler and `/api/advance`                                                 | Done, not exercised live                                                                           |
| 4    | Schema: crop benchmarks, pestWatch, `benchmark` type, read-only operator docs | Done, not exercised in Studio                                                                      |
| 5    | Benchmarks: units, PSD, HarvestStat extract, resolve, sync                    | Done (code and tests); sync not yet run against the dataset                                        |
| 6    | Orphans: World Bank trend, GBIF regional pests, seed script                   | Done (code, tests, live probes); seed run 2026-09-21                                               |
| 7    | UI: stage pipeline, benchmark card, pest panel                                | Done (build and lint pass); signed-in render not verified                                          |
| 8    | Public site (/, /about, /docs), /dashboard, theme toggle                      | Done; checked signed out only                                                                      |
| 9    | Live data on the landing page, gradient backdrop, DEV.to text removed         | Done; checked by curl, not in a browser                                                            |
| 10   | Copy rewrite; dashboard with farm conditions, season GDD progress, activity   | Done (build, lint, tests pass); security sweep and layout tidy done; signed-in render not verified |
| 11   | Multi-farm dashboard: farm picker, switcher, season board, compare, CSV export; `gddModelKey` fix | Done; signed-in render checked by the user (2026-09-21)
| 12 | Decision context: `workflow/context.ts`, `evaluateAll`, evidence refs, readiness checklist (plan `~/.claude/plans/pasted-content-id-a957-c-users-user-pc-flickering-ember.md`, steps 0 and 1) | Done (commit db2a526); pure modules, tests pass |
| 13 | Recommendation workflow: `agronomyRecommendation` schema, state machine, `/api/recommendations` routes, dashboard queue (plan step 2) | Done; build, lint, 165 tests pass; unauthenticated calls return 401; signed-in create/approve/reject not exercised |
| 14 | Evidence, readiness and stage-history UI (plan step 3) | Done; typecheck, lint, 165 tests, build pass; season page not rendered in a signed-in browser; timeline threshold not shown (not stored in `stageHistory`); per-source benchmark availability not added |
| 15 | Agent, Path One (plan step 4) | Skipped by user: no Sanity Context or Knowledge Base access |
| 16 | Sanity App SDK control room (plan step 5) | Dropped by user 2026-09-21: optional bonus; the CLI cannot run a nested app inside a Studio project |
| 17 | Scenario simulator (plan step 6, first half): `scenario.ts`, `/api/scenario`, "What if?" on the season page | Done; typecheck, lint, 169 tests, build pass; not exercised signed in; demo dataset, screenshots and DEV posts remain |
| 18 | Pages SPA plan, Milestone 1: Pages Functions login and observation writes, security fixes | Done; pushed and deployed 2026-09-23 (85eb7ee) |
| 19 | Pages SPA plan, Milestone 2: clean slate (Next, Auth.js, Studio removed; `ttlCache`; `src/components` excluded from tsc/lint until Milestone 3) | Done; typecheck, lint, 190 tests, build, typegen, audit 0 |

Deadline 2026-10-04. Cut ladder: irrigation advisory, `/api/override`, World Bank trend, GBIF pestReport creation, `benchmark` doc type. Never cut: GDD layer, guard rewrite, effectiveDate/basis, yield-honesty controls.
