# Handoff (2026-09-23)

Read first: `CLAUDE.md`. Active plan: `~/.claude/plans/alright-we-need-to-humming-clock.md`
(Pages SPA + Functions on Sanity). M3 design method: `~/.claude/plans/can-we-use-the-recursive-umbrella.md`.

## State

Branch `master`. M1 done and pushed (6ea7d89). M1 security fixes a4f768c + 05adbd6 and the
rate-limit fix (this commit) are not pushed and not deployed to mecropolis.pages.dev.

M1 security findings all closed: `POST /api/observations` has a global cap of 60/hour counted in
Sanity (`_createdAt`, same query as the field lookup); IPv6 clients keyed on /64 (`clientIp`);
`fieldId` no longer allows `.`. Accepted: logout only clears the cookie. Endpoints documented in
`api/endpoints.md`. Cap branch (429 at 60) not exercised live; would need 60 real writes.

`npm run build` still runs `next build` and fails without the old Next env vars; deploy uses vite build.

## Next

1. Push and deploy (`npm run deploy`) when the user asks.
2. Milestone 2 clean slate.
3. Milestone 3 with the `impeccable` skill, refining the current look (plan above).

## Open threads

- Observation schema says "never typed by an operator"; update in M4.
- Deadline 2026-10-04 vs user "time isn't a factor".
- Mark older plans superseded (worth-noting..., review-what-is-going...) in M6 docs pass.
- Repo visibility and LICENSE choice (M6).
