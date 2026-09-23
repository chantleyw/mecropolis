# Handoff (2026-09-23)

Read first: `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`. Active plan: `~/.claude/plans/alright-we-need-to-humming-clock.md`
(Pages SPA + Functions on Sanity). M3 design method: `~/.claude/plans/can-we-use-the-recursive-umbrella.md`.

## State

Branch `master`. M1 deployed (85eb7ee). M2 pushed, not deployed. M3a committed locally, not pushed
or deployed: PRODUCT.md, DESIGN.md (+ `.impeccable/design.json`), React Router port of every route,
`useLive`/`useAsync` hooks, `/api/landing` and `/api/conditions` Functions. Verified locally signed
in (user entered the demo password). Open-Meteo archive returned 429 to this machine during the
check, so season GDD showed as unavailable; not a code fault, recheck next session.

User decisions this session: landing loaders in one Function; app routes sign-in only as a UX gate
(dataset stays public-read); North Star "The Living Almanac"; app surfaces calmer than public ones.

## Next

1. M3b: Impeccable `critique`, then `polish` + `audit` + `harden` per surface (modes: `/`, `/about`
   Persuade; `/docs` Read; app routes Operate). Read `reference/craft-floor.md` before UI edits. Run
   `impeccable detect --json src/pages src/components src/layouts` once at the end.
2. User: `npx wrangler pages secret put FAS_API_KEY --project-name=mecropolis` (not set in
   production; PSD shows unavailable until then). Then deploy when asked.

## Open threads

- Write controls removed until M4 wires their Functions: Reconcile now, Load regional sightings,
  What if? (ScenarioSimulator), RecommendationActions. Components kept.
- JS bundle 615 kB (Sanity client, Zod, React, Router): consider route code splitting in audit.
- `fetchArchive` also requests hourly soil series; heavy for per-season browser calls.
- `format:check` flags pre-existing files; new files not yet run through Prettier.
- Observation schema says "never typed by an operator"; update in M4. Schema `icon`s removed.
- Deadline 2026-10-04 vs user "time isn't a factor". Mark older plans superseded, repo visibility,
  LICENSE (M6).
