# Handoff (2026-09-22)

Read first: `CLAUDE.md`. Active plan: `~/.claude/plans/worth-noting-that-rendering-sequential-blanket.md`
("Mecropolis: rebuild as an App SDK web app"). Milestone 0 committed (`f324b5f`). Milestone 1
(Auth, and the gate) code done this session, **not yet committed**, **gate not yet proven**.
Path Two, no deadline pressure.

## Milestone 1 state

- Real API differs from the plan text: `@sanity/sdk-react@3.3.0` has no `LoginCallback` export and
  no `/auth/callback` route to build — `AuthBoundary` handles login/callback UI itself via
  `LoginComponent`/`CallbackComponent`/`LoginErrorComponent` overrides. The hook is `useLoginUrl`
  (singular), not `useLoginUrls`. User approved adapting to the real API (see
  `planning/decisions.md`). `AuthConfig` itself (`callbackUrl`, `providers`, `apiHost`,
  `clientFactory`, `initialLocationHref`) matched the plan.
- `src/App.tsx`: `SanityApp` (config from `publicEnv`) wraps `AuthBoundary` with a branded
  `SignInScreen` as `LoginComponent` (uses `useLoginUrl`), plus a `SignedInBar` showing the current
  user and a sign-out button (`useLogOut`). No callback route exists or is needed — no React
  Router yet (that's Milestone 2).
- `src/lib/publicEnv.ts` rewritten off `import.meta.env.VITE_SANITY_PROJECT_ID` /
  `VITE_SANITY_DATASET` (was `process.env.NEXT_PUBLIC_*`).
- `.env.example` and `.env.local` gained the two `VITE_SANITY_*` keys **additively**, alongside the
  existing Next vars — did not truncate to "VITE only" as the plan's literal text says, because the
  Next app still coexists and still reads its own vars until Milestone 8's removal commit. Flag if
  this reading of scope is wrong.
- `npx sanity cors add http://localhost:5173 --credentials` run (Milestone 0 was supposed to do
  this and didn't; done now). Vercel origin still not registered — that half of the gate is
  untouched.
- Verified: `npx tsc --noEmit`, `npm run lint`, `npm run test` (169 pass), `npm run build:vite` all
  clean. `npm run dev:vite` serves the HTML shell (curled, 200).
- **Not verified — needs a human:** the actual sign-in round trip. I have no browser tool and no
  Sanity account credentials, so I could not click through `sanity.io/login`, confirm
  `localStorage.__sanity_auth_token` gets a stamped token, confirm reload persistence, or confirm
  sign-out clears it. This is the plan's actual Milestone 1 gate and it is still open.

## Next

1. **You need to do this by hand:** run `npm run dev:vite`, open `http://localhost:5173`, sign in
   with a Sanity account, confirm the stamped token lands in `localStorage`, reload and confirm
   still signed in, sign out and confirm it clears. Report back what happened (or any error) so
   the milestone can be marked verified rather than assumed.
2. Then deploy the stub to Vercel, register that origin in manage.sanity.io CORS with
   **Allow credentials**, and repeat the round-trip there. If it fails, stop and report — the
   plan's fallback is the `sanity deploy` org-dashboard target, not a token-paste workaround.
3. Also confirm in manage.sanity.io whether the dataset is genuinely public-read (only ever
   inferred from a comment in `src/auth.ts`) — Milestone 3's public routes depend on this.
4. Once the gate is proven, commit Milestone 1 and continue to Milestone 2 (query layer + app
   shell). Re-read the plan file at the start of each milestone.

## Open items the plan does not resolve

- Security findings from the 2026-09-21 review (no CSP, no sign-in throttle, routes echoing
  upstream error text, `FAS_API_KEY` in a query string) were scoped to the Next/Auth.js build.
  Most become moot once that build is deleted in Milestone 8. Re-assess what's left once the
  removal commit lands.
- Post-deploy tasks from the previous plan (Sanity CORS/webhook, Vercel Cron, making the repo
  public, the DEV post) are superseded by Milestone 8's deploy step. Cron is dropped, not carried
  forward (Milestone 5).
- The old plan file (`while-that-is-busy-wiggly-balloon.md`) and its finished Phases 0-2 commits
  (`5fd2db1`, `a5c1f38`, `44e64ef`) stay in git history; the Studio cockpit they built becomes dead
  code, removed with the Studio in Milestone 8. Worth a paragraph in the DEV write-up.
