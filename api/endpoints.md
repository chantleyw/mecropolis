# Endpoints

All responses are JSON. Errors return `{ error }` (advance returns `{ success: false, error, reason }`). Upstream error messages are currently echoed to clients (known issue).

## `GET|POST /api/advance`

Walks seasons through the stage machine using GDD.

- Auth: session, or `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends GET at 04:00 UTC daily, `vercel.json`). Exempt from `src/proxy.ts`; the handler authenticates itself.
- Body (POST, optional): `{ "seasonId": string }`. Without it, all seasons.
- Per-season outcome: `advanced` (200), `unchanged` (200), `conflict` (409, revision changed), `error` (502, upstream failure).
- Writes stage, `stageHistory` entries with `effectiveDate`, `basis`, `gddTotal`, `derivedFrom`, and one `weatherSnapshot` per run. Never writes `actualHarvest` or `yieldAmount`.
- Rate limited: 20 per minute (in-memory, per instance).

## `GET /api/weather`

Session required. Query: `fieldId` (required), `start`, `end` (dates, optional).

- No dates: 14-day forecast, `{ kind: "forecast", data, ...summary }`.
- Past range: archive. Future range: climate projection (temperature and rainfall only). Field coordinates come from Sanity, never from the request.
- 400 bad query, 401, 404 unknown field, 429 rate limited.

## `POST /api/webhook/sanity`

Public, signature-verified (`sanity-webhook-signature`, `SANITY_WEBHOOK_SECRET`, checked against the raw body before parsing).

- Only `_id` is taken from the payload; the pest report is re-read from Sanity.
- 401 bad signature, 400 bad body, 404 unknown report, 200 `{ skipped }` for severity below high or already assessed, otherwise patches `recommendedAction` with a humidity-aware risk assessment.

## `/api/auth/*`

Auth.js v5 credentials provider (single demo account, bcrypt hash in env).

## GET /api/pests?seasonId=

Session required. Returns regional GBIF sightings (within 100 km of the farm) for the pests in the season's crop `pestWatch`: `{scope: "regional", radiusKm, pests[{pest, sourceId, sourceUrl, date, distanceKm}]}`. 404 when the season, farm coordinates or `pestWatch` is missing; 502 when GBIF fails.

## POST /api/pests

Body `{seasonId}`. Same checks; stores each sighting as a `pestReport` (`source: gbif`, `scope: regional`, `distanceKm`, no severity) with a deterministic `_id`. Existing reports are not overwritten. Returns `{scope, radiusKm, reports}`.
