# Handoff (2026-09-22)

Read first: `CLAUDE.md`. Active plan: `~/.claude/plans/worth-noting-that-rendering-sequential-blanket.md`
("Mecropolis: rebuild as an App SDK web app", Milestone 0 of 9 done, approved, in progress).
Path Two, no deadline pressure.

## Direction change this session

The prior plan (`~/.claude/plans/while-that-is-busy-wiggly-balloon.md`, "Sanity depth build",
Phases 0-2 done) is **superseded, not continued**. Decision: stop pushing depth into the embedded
Studio and instead rebuild the frontend as a React + Vite + TypeScript + React Router SPA driven
by `@sanity/sdk-react`, with Sanity Content Lake as the only backend (Path Two: "your own
interface, instead of another read-only frontend"). No Next.js, no Studio, no Auth.js in the end
state. Full rationale, architecture, milestone list and the honest trade-offs (client-side
workflow enforcement, no unattended cron) are in the new plan file — read it before continuing.

This also clears three stale blockers for free: the unknown demo password, the broken local
Next render, and the stuck Vercel Next build — none of them matter once the Next app is removed
in Milestone 8.

## State

- **Milestone 0 done and verified:** Vite scaffold added beside the untouched Next app.
  - Installed `vite`, `@vitejs/plugin-react@5.2.0` (pinned; `^6` pulls an unresolvable
    `@babel/core@8` peer conflict — do not bump without re-checking), `@tailwindcss/vite`,
    `@sanity/sdk-react`, `react-router`, `groq`. `npm audit`: 0 vulnerabilities.
  - New: `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx` (placeholder),
    `src/vite-env.d.ts`, `src/styles/globals.css` (copied from `src/app/globals.css`, font vars
    repointed from `--font-geist-sans`/`mono` to literal `"Geist"`/`"Geist Mono"` since
    `next/font/google` is gone; Google Fonts serves the Geist family directly — verified, 200).
  - `public/favicon.ico` copied from `src/app/favicon.ico` (Vite serves `public/` at root; the
    old Next-template SVGs in `public/` are unused and left for the Milestone 8 cleanup).
  - `package.json` gained `dev:vite` / `build:vite` / `preview:vite` scripts; existing `dev` /
    `build` / `start` (Next) untouched.
  - **Fixed a real conflict, not cosmetic:** Vite auto-discovers the root `postcss.config.mjs`
    (written for Next's `@tailwindcss/postcss` with string plugin names) and fails loading it
    directly (`TypeError: Invalid PostCSS Plugin found at: plugins[0]`). Fixed by setting
    `css: { postcss: { plugins: [] } }` in `vite.config.ts` so Vite skips that file entirely;
    `@tailwindcss/vite` needs no PostCSS config of its own. This file will be deleted outright in
    Milestone 8 once the Next app is gone — this workaround is only for the coexistence period.
  - Verified: `npm run dev:vite`, `GET /` 200, `GET /src/styles/globals.css` 200 with theme tokens
    present in the processed output, `npx tsc --noEmit` clean across the whole tree (both apps'
    files typecheck together, no conflicts). Dev server stopped after verification.
- Pre-existing uncommitted changes, untouched this session and **not yet committed**:
  `planning/next.md` itself (was already modified before this session), `scripts/hash-password.mjs`
  (comment-only tweak from a prior session), `planning/sanity-feature-list.txt` (new, untracked).
  Nothing from Milestone 0 has been committed yet either — the whole session's work is
  uncommitted in the working tree.

## Next

1. Commit Milestone 0 (with the `ship` skill) before starting Milestone 1, so there is a clean
   checkpoint before auth work begins.
2. **Milestone 1 — Auth, and the gate.** Build `SanityApp` + `AuthBoundary` + `/auth/callback`
   + sign-in screen. This milestone ends on a hard gate: the SDK's standalone login sends
   `origin=<location.href>` to `sanity.io/login` and that origin must be registered in
   manage.sanity.io CORS with **Allow credentials**. Prove the round-trip on
   `http://localhost:5173` first, then on the deployed Vercel URL. **If the Vercel origin fails
   the round-trip, stop and report — do not improvise a token-paste fallback**; the plan's
   designed fallback is the `sanity deploy` org-dashboard target, not a workaround.
3. Also confirm while in manage.sanity.io: whether the dataset is genuinely public-read (only
   ever inferred from a comment in `src/auth.ts`, never confirmed) — the public landing routes in
   Milestone 3 depend on this.
4. Continue Milestones 2-8 in order; each has its own verify step in the plan file. Re-read the
   plan file at the start of each milestone rather than relying on this summary.

## Open items the plan does not resolve

- Security findings from the 2026-09-21 review (no CSP, no sign-in throttle, routes echoing
  upstream error text, `FAS_API_KEY` in a query string) were scoped to the Next/Auth.js build.
  Most become moot once that build is deleted in Milestone 8 (no server routes, no bcrypt sign-in,
  `FAS_API_KEY` moves to a local-only script per Milestone 8). Re-assess what's left once the
  removal commit lands rather than assuming the list is fully closed.
- Post-deploy tasks from the previous plan (Sanity CORS/webhook, Vercel Cron, making the repo
  public, the DEV post) are superseded by this plan's own deploy step (Milestone 8) and its CORS
  requirements (Milestone 1). Cron is explicitly dropped, not carried forward (Milestone 5).
- The old plan file (`while-that-is-busy-wiggly-balloon.md`) and its finished Phases 0-2 commits
  (`5fd2db1`, `a5c1f38`, `44e64ef`) stay in git history; the Studio cockpit they built becomes
  dead code, removed with the Studio in Milestone 8. Worth a paragraph in the DEV write-up.
