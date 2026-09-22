# Handoff (2026-09-22)

Read first: `CLAUDE.md`. Active plan: `~/.claude/plans/while-that-is-busy-wiggly-balloon.md`
("Mecropolis: Sanity depth build" — adds Studio cockpit + delivery-layer depth for the DEV.to
submission; approved and in progress, Phases 0-2 of 9 done). Submission is Path Two; no deadline
pressure per the user — take the time needed to do this well.

## State

- Roadmap 1-14, 17 done; 15 (agent) skipped, 16 (App SDK) dropped. App is feature-complete.
- Sanity depth plan Phase 0 (commit `5fd2db1`), Phase 1 (commit `a5c1f38`) and Phase 2 (this
  session) done and verified: typecheck, lint, 169 tests, build, `npm audit` 0 all clean after each.
- **Phase 2 deviated from the plan doc on two points, both confirmed with the user:**
  - `@sanity/icons` is v5.2.2, which removed root-entry icon exports (`import {X} from
    "@sanity/icons"` now resolves to `never`). Icons are imported per-icon from subpaths instead,
    e.g. `import { CalendarIcon } from "@sanity/icons/Calendar"`. Applied across all 10 schema
    types, `sanity/structure/index.ts` and `sanity.config.ts`.
  - `WarningOctagonIcon` (used in the plan's pest-alerts listItem) doesn't exist in this package
    at all. Substituted `WarningFilledIcon` (`@sanity/icons/WarningFilled`).
  - Badge tones: `DocumentBadgeDescription.color` only accepts `'primary'|'success'|'warning'|
    'danger'` (no `'caution'`/`'default'` as the plan's snippet implied). Mapped
    proposed→warning, approved→primary, rejected→danger, completed→success, expired→none;
    pestReport high/critical→danger, medium→warning, low→none. Season-stage badge shows the
    stage label with no tone (plan didn't specify one).
  - Favicon: an `icon.svg` file under `src/app/studio/[[...tool]]/` breaks the build
    (`Optional catch-all must be the last part of the URL`) — Next's file-convention icons can't
    live inside a catch-all segment. Used `public/studio-icon.svg` + a manual `icons` field
    merged into the exported `metadata` in `page.tsx` instead.
- **Not verified this session:** interactive click-through of `/studio` (pane navigation, badge
  rendering, Farms drill-down) — blocked by the same missing demo password noted below. The
  production build did statically generate `/studio/[[...tool]]` without error, which at least
  proves the structure resolver and config compile and import correctly.
- **Production deploy is stuck on Vercel's side, not a code issue.** Two separate `vercel deploy
  --prod` attempts (`mecropolis-hc8oxy8dq…`, `mecropolis-7hi8ru32a…`) sat at `status: UNKNOWN`
  with no build machine ever assigned and zero logs, for 35+ minutes each. The local `npm run
  build` succeeds in under 20s both times. This looks like a Vercel platform/account stall —
  worth checking Vercel's status page or contacting support before retrying blindly again.
  `npx vercel ls mecropolis` shows the history; `npx vercel inspect --logs <url>` confirms no
  logs land for the stuck ones.
- **Key discovery, already resolved:** the plan assumed the Sanity dataset was public-read (no
  token needed for reads). Tested directly and that's false — an anonymous client returns 0
  documents (not an error) with `useCdn` on or off and no perspective set. Fixed by creating a
  Viewer-scoped `SANITY_API_READ_TOKEN` (`npx sanity tokens create "Mecropolis read client"
  --role=viewer --yes`), added to `.env.local`, `.env.example`, and Vercel production env.
  `src/lib/sanity/readClient.ts` is `server-only` and carries this token; nothing reaches the
  browser. **This changes Phase 7 of the plan** (Live Content API) — its `defineLive` snippet
  still shows the old token-free design; use `serverToken: env.SANITY_API_READ_TOKEN` instead.
  The plan file itself has been corrected at the Phase 1 section with this note.
- The `Dataset must be public-read only` line in the old security-review open thread (below) is
  now stale — superseded by the scoped-token approach above.

## Repo state (confirmed)

Pushed to `origin/master` (`chantleyw/mecropolis`) at `a5c1f38`. Verified: all 24 remote commits
carry `Co-Authored-By: Claude <noreply@anthropic.com>` — the earlier history rewrite that
couldn't be confirmed due to network issues did in fact land. Fast-forward push, no force needed.
`planning/next.md` itself is still uncommitted (this handoff) — commit it in the next session
once reviewed.

## Decisions from this conversation

- **Keep the Sanity dataset private.** Submission requires project ID *or* public dataset link;
  project ID alone satisfies it. Public dataset was considered and rejected — would expose all
  fields (yields, pest reports, recommendation notes) beyond what the app's own queries select.
- **Staying on Vercel.** User will run the production deploy themselves once the Sanity depth
  work is complete — no action needed from a session on this.
- **Judges reach the app through the demo account, not through the Sanity dataset.** The dataset
  staying private doesn't block review: judges never query Sanity directly. They need the
  deployed URL plus the demo credentials (`AUTH_DEMO_USER` / the plaintext password behind
  `AUTH_DEMO_PASSWORD_HASH`) to sign in — both `/dashboard` and `/studio` are Auth.js-gated.
  Include those credentials in the DEV post; that's what they're for.
- **Nobody in these sessions has the plaintext demo password** — only `AUTH_DEMO_PASSWORD_HASH`
  (bcrypt, one-way) is stored anywhere. Only whoever originally ran
  `node scripts/hash-password.mjs '<password>'` knows it. Before the DEV post: either recover
  that plaintext, or pick a new one, re-run the hash script, and update
  `AUTH_DEMO_PASSWORD_HASH` in `.env.local` and Vercel env to match. This also blocked this
  session's local sign-in click-through verification — same reason.

## Next

1. Get the deploy unstuck (see above), then verify: public pages load, `/api/advance` returns
   401 unauthenticated, sign in and exercise the season page, scenario run, recommendation
   create/approve/reject, **and click through `/studio`** (Phase 2's pending manual check). No
   plaintext demo password was available this session to do this locally either — only the
   bcrypt hash is stored.
2. Continue the Sanity depth plan from **Phase 3** (document actions routed through the API)
   through Phase 8. Full detail and verified code snippets are in the plan file; re-read it at
   the start of the next session rather than re-deriving. Note the Phase 2 deviations recorded
   above before trusting the plan's exact snippets for later phases — check `@sanity/ui` /
   `sanity` package APIs the same way if something doesn't import as written.
3. Set Sanity CORS to the deployed URL (needed for Phase 7's Live Content API and any webhook
   traffic); confirm Vercel Cron still fires against `CRON_SECRET`.
4. Update `planning/decisions.md` and README as phases land (the plan's Phase 8 already lists a
   Cross-cutting section with what to record). Make the repo public for submission when ready
   (ask first). Write the DEV post — the plan's Cross-cutting section lists what's worth
   collecting for the honesty-graded write-up (action-through-API decision, enum SSOT cleanup,
   the Portable Text scope decisions, the read-token discovery, free-plan exclusions).

## Open threads (security review, appsec + secrets agents, 2026-09-21)

- No sign-in brute-force protection; rate limits are per instance and keyed by username. Add
  Vercel WAF rules on `/api/auth/*`, `/signin`, `/api/*`; use a long random demo password.
- Routes echo upstream error text (`advance`, `recommendations`, `weather`, `scenario`, webhook).
  Return fixed strings.
- No CSP. `FAS_API_KEY` in a query string. `safeCallback` accepts `/\host`. `/api/pests` lacks
  content-type check. ~~Dataset must be public-read only~~ — superseded: the dataset is private
  and reads now use a scoped Viewer token instead (see State above); write token still not used
  on read paths, which was the actual finding this line was chasing, and Phase 1 closes it.
- `/security-review` skill fails without an `origin/HEAD` (a remote now exists; retry).
- Step 3 gaps; `format:check` fails on 8 pre-existing files (unrelated to the Sanity depth work,
  do not "fix" incidentally); GDD parameters uncited; stale-cache thread; seed replaces farm,
  fields, crops.
