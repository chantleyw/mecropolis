# Handoff (2026-09-21)

Read first: `CLAUDE.md` (traps, commit trailer rule). Plan of record: `~/.claude/plans/pasted-content-id-a957-c-users-user-pc-flickering-ember.md`. Submission due 2026-10-04 23:59 PDT (Path Two). Deployed app plus honest DEV post is enough; recording and screenshots are optional if deployed.

## State

- Roadmap 12-14, 17 done; 15 (agent) skipped, 16 (App SDK) dropped (CLI cannot run a nested app in a Studio project).
- Verified today: typecheck, lint, 169 tests, build, `npm audit` 0.
- Vercel: logged in, linked to `moersebene/mecropolis`, all 9 production env vars set (secrets sensitive). `vercel.json` now has `"framework": "nextjs"` (first deploy failed: no preset, looked for `dist`). **Not deployed**: retries failed with `fetch failed` (network).
- GitHub: private repo `chantleyw/mecropolis` created. History was rewritten locally to add `Co-Authored-By: Claude <noreply@anthropic.com>` to all 22 commits (user request). **Force push not confirmed**: `--force-with-lease` was rejected (stale info); the remote may still hold the old history. Fix: `git ls-remote origin refs/heads/master`, then `git push --force-with-lease=master:<that sha> origin master`.
- Local HEAD fc70648 (Set Vercel framework to nextjs) is committed; `CLAUDE.md` is untracked by design.

## Next

1. Push (above), then `npx vercel deploy --prod --yes`.
2. Post-deploy: public pages load; `/api/advance` returns 401 unauthenticated; sign in and exercise the season page, scenario run, recommendation create/approve/reject.
3. Set Sanity CORS/webhook to the deployed URL; confirm Vercel Cron works (CRON_SECRET is set).
4. Update `planning/decisions.md` and README (steps 12-14, scenario simulator, dropped 16). Make repo public for submission (ask first). Write the DEV post (What I Built, Demo, Code, Build Process, What broke, project ID `mns0vhec`, public transcript).

## Open threads (security review, appsec + secrets agents, 2026-09-21)

- No sign-in brute-force protection; rate limits are per instance and keyed by username. Add Vercel WAF rules on `/api/auth/*`, `/signin`, `/api/*`; use a long random demo password.
- Routes echo upstream error text (`advance`, `recommendations`, `weather`, `scenario`, webhook). Return fixed strings.
- No CSP. Write token used on read paths (consider read-only token). `FAS_API_KEY` in a query string. `safeCallback` accepts `/\host`. `/api/pests` lacks content-type check. Dataset must be public-read only.
- `/security-review` skill fails without an `origin/HEAD` (now a remote exists; retry).
- Step 3 gaps; `format:check` fails on 8 old files; GDD parameters uncited; stale-cache thread; seed replaces farm, fields, crops.
