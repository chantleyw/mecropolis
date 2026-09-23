# Handoff (2026-09-23)

Read first: `CLAUDE.md`. Active plan (only one): `~/.claude/plans/alright-we-need-to-humming-clock.md`
(Cloudflare Pages SPA + Pages Functions on a Sanity backend). It supersedes
`worth-noting-that-rendering-sequential-blanket.md` and `review-what-is-going-sparkling-allen.md`
(not yet marked superseded in those files; do in M6 docs pass).

## State

Branch `master`. M1 done and pushed (6ea7d89): Pages Functions hold the Sanity write token,
published demo login, observation writes; verified locally and on mecropolis.pages.dev.
M1 security fixes committed 2026-09-23 (see below). `DEMO_PASSWORD` is a plain secret with
constant-time compare (password is published).

## Next

1. User decision on M1 security finding 1 (rate limiting), see below.
2. Milestone 2 clean slate.

## Security findings (M1 review, 2026-09-23)

Fixed 2026-09-23: body cap (`readJsonBody` in `functions/_lib/http.ts`: 415 non-JSON, 413 over
8 KB incl. chunked, 400 malformed); missing CF-Connecting-IP now 400, no shared bucket;
`src/lib/api.ts` throws on non-JSON 2xx; `.env.example` lists SESSION_SECRET, DEMO_USER,
DEMO_PASSWORD. Sanity token confirmed Editor by user. Accepted: logout only clears the cookie.

Open, needs user pick: in-memory limiters are per isolate. Planned fix does not apply: Pages
rejects `[[ratelimits]]` (not in wrangler 4.136 `supportedPagesConfigFields`); WAF rules do not
cover `*.pages.dev`. Options: (a) global write cap checked in Sanity (count observations in last
hour before create), no new infra; (b) KV counter per IP/day (approximate, eventually consistent);
(c) move Functions to a Worker with `[[ratelimits]]`; (d) accept for demo.

`npm run build` still runs `next build` and fails without the old Next env vars; deploy uses vite build.

## Open threads

- Observation schema says "never typed by an operator"; update in M4.
- Deadline 2026-10-04 vs user "time isn't a factor".
- Repo visibility and LICENSE choice (M6).
