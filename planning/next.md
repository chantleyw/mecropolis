# Handoff (2026-09-23)

Read first: `CLAUDE.md`. Active plan: `~/.claude/plans/alright-we-need-to-humming-clock.md`
(Pages SPA + Functions on Sanity). M3 design method: `~/.claude/plans/can-we-use-the-recursive-umbrella.md`.

## State

Branch `master`. M1 pushed and deployed (85eb7ee). M2 clean slate committed, not pushed or deployed.

M2 removed Next, Auth.js, next-sanity, Studio (config is schema only, `sanity/project.ts` reads
`VITE_SANITY_*` from `process.env` for the CLI), bcrypt and `hash-password.mjs` (M1 login compares
a plaintext `DEMO_PASSWORD` in constant time, no hash). `unstable_cache` replaced by
`src/lib/cache/ttl.ts`; `queries.ts` uses `groq` `defineQuery` and the public browser client;
`loadLanding(fasApiKey)` takes the PSD key as an argument. Scripts: `dev`/`build`/`preview` are
Vite. ESLint is flat config with typescript-eslint + react-hooks. `sanity` is a devDependency;
override pins still needed (all pulled by `sanity`).

## Next

1. Milestone 3 with the `impeccable` skill: port `src/components` to React Router, then remove
   its exclusion from `tsconfig.json` and `eslint.config.mjs`.
2. Push and deploy M2 when the user asks.

## Open threads

- `landingData.ts` and `progress.ts` log via `process.stderr` and PSD needs the server key: in M3
  they run in the browser or behind a Function; decide there.
- `format:check` flags 18 pre-existing files (M1 functions, planning docs, `App.tsx`, `api.ts`).
- Observation schema says "never typed by an operator"; update in M4.
- Schema `icon`s removed with `@sanity/icons` (no Studio).
- Deadline 2026-10-04 vs user "time isn't a factor".
- Mark older plans superseded in M6 docs pass. Repo visibility and LICENSE (M6).
