# Handoff (2026-09-24)

Read first: `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`. Active plan: `~/.claude/plans/alright-we-need-to-humming-clock.md`.

## State

Branch `master`, clean apart from untracked `.claude/` and `.impeccable/` scratch. 10 commits not pushed.
M4 and M5 done and deployed to https://mecropolis.pages.dev (deployment dcf1a65). Sanity schema deployed;
webhook "Mecropolis" (production dataset) live: a real observation fired a signed delivery (HTTP 200) and the
reconcile ran (season-ob-river-2026 blocked at 1062.8 of 1350 GDD for pre-harvest, correct).
Production secrets: DEMO_USER, DEMO_PASSWORD, FAS_API_KEY, SANITY_API_WRITE_TOKEN, SANITY_WEBHOOK_SECRET, SESSION_SECRET.
Check webhooks with `npx sanity hooks list` / `npx sanity hooks logs Mecropolis --detailed` (the Editor token cannot read hooks).

## Next

M6 (repo and submission ready), roadmap after row 23. CSP must add `img-src https://cdn.sanity.io` (no CSP header is sent today).
Submission post: Western Cape framing and the mid-project rebuild story (see memory).

## Open threads

- Not pushed. `CRON_SECRET` not a production secret; no scheduler.
- Photo upload and notes save not exercised in production.
- Notes have per-IP limit only. Photo uploads: global 20/h.
- Observations attach to the field's latest non-review season.
- No recommendations exist and no UI creates them. `/api/weather` has no UI caller.
- Reconcile-all does one archive fetch per season (Workers 50-subrequest limit).
- Unhandled Sanity errors in Functions surface as the platform 500 (non-JSON).
- Design drift (report only): older routes use `rounded-lg`, brand green in StageStepper and GddChart; at 768-1279 px east farms hide under the farm panel.
- Prettier fails on 17 committed files (pre-existing). `favicon.ico` old seedling. RegionMap 1.04 MB.
- Copy changes to tell user: hero H1, CTA wording, eyebrows removed.
