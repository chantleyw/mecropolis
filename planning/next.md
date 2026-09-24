# Handoff (2026-09-24)

Read first: `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`. Active plan: `~/.claude/plans/alright-we-need-to-humming-clock.md`.

## State

Branch `master`. M5 built (roadmap row 23): `functions/api/{assets,notes,history}.ts`,
`functions/api/webhook/sanity.ts`; reconciler moved to `functions/_lib/reconcile.ts` (shared by
`/api/advance` and the webhook); `src/lib/webhook/signature.ts` now Web Crypto (async). Season page:
Season notes (Portable Text, `src/lib/notes.ts`), Field photo (`FieldPhoto.tsx`, browser re-encode
drops EXIF), Revision history. Dashboard cards show the field photo. Contracts and webhook setup:
`api/endpoints.md`. 249 tests.

## Needs the user

- Schema deploy: `npx sanity login`, then `set -a; . ./.env.local; set +a; npx sanity schema deploy`
  (the Editor token lacks deploySchema).
- Sign in on localhost to check the season page UI (notes editor, photo upload, history panel).
- After deploy: `wrangler pages secret put SANITY_WEBHOOK_SECRET`, create the webhook per
  `api/endpoints.md`.

## Next

M6 (repo and submission ready). CSP must add `img-src https://cdn.sanity.io` for field photos.

## Open threads

- Nothing pushed; M3b, M4, M5 not deployed. `CRON_SECRET` not a production secret; no scheduler.
- Open-Meteo archive unreachable from this machine on 2026-09-24 (TLS error); webhook reconcile
  returned 502 for that reason.
- Notes have per-IP limit only (overwrite, no dataset growth). Photo uploads: global 20/h.
- Observations attach to the field's latest non-review season (older season pages miss them).
- No recommendations exist and no UI creates them. `/api/weather` has no UI caller.
- Reconcile-all does one archive fetch per season (Workers 50-subrequest limit).
- Unhandled Sanity errors in Functions surface as the platform 500 (non-JSON).
- Design drift (report only): older routes use `rounded-lg` controls, brand green in StageStepper
  and GddChart. At 768-1279 px east farms hide under the farm panel.
- Prettier fails on 17 committed files (pre-existing). `favicon.ico` old seedling. RegionMap 1.04 MB.
- Copy changes to tell user: hero H1, CTA wording, eyebrows removed.
