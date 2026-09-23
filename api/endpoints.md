# Endpoints

All responses are JSON. Errors return `{ error }`. Upstream error messages are currently echoed to clients (known issue).

## Pages Functions (`functions/`, Cloudflare Pages)

Same-origin JSON only (403 cross-origin, 415 non-JSON, 413 over 8 KB, 400 malformed). Missing or malformed `CF-Connecting-IP` is 400. Per-client limits are in-memory per isolate, keyed by IP (IPv6 by /64, IPv4-mapped as IPv4).

- `POST /api/session/login`: `{ user, password }` against the published demo credentials; sets the session cookie. 10 per minute per client.
- `GET /api/session/me`: `{ user }` or `{ user: null }`.
- `POST /api/session/logout`: clears the cookie.
- `POST /api/observations`: session required. `{ fieldId, notes }`; `fieldId` matches `[A-Za-z0-9_-]{1,128}`. 30 per minute per client, plus a global cap of 60 observations per hour counted in Sanity (`_createdAt`), shared across isolates; concurrent requests can overshoot it slightly. 201 `{ _id }`, 404 unknown field, 429 over either limit.

Signed-in Functions below share `functions/_lib/http.ts` `guard`: session cookie (401), per-IP limit (429), and for writes a same-origin `Origin` (403). Document ids in bodies and queries match `[A-Za-z0-9_-]{1,128}` (no dotted draft ids). Zod issues are returned as `{ error: "path: message; ..." }`. Unhandled Sanity failures surface as the platform 500.

- `POST /api/treatments`: session, write. `{ seasonId, date (YYYY-MM-DD, at most one day past today UTC), type, product, dosage?, method?, notes? }` (schema `src/lib/fieldLog.ts`, shared with the form). `applicator` is the session user. 30/min per client plus 60 treatments per hour across isolates. 201 `{ _id }`, 404 unknown season.
- `POST /api/recommendations`: session, write. `{ seasonId, type, rationale, evidence[], expiresAt? }`; body up to 64 KB. 201 `{ id, status: "proposed" }`, 404 unknown season. No UI calls it yet.
- `POST /api/recommendations/:id/{approve|reject|complete}`: session, write. `{ decisionNote? }`. Checks the state machine (`src/lib/recommendations/machine.ts`), then patches with `ifRevisionId`. 200 `{ id, status }`, 404 unknown id or action, 409 invalid transition or revision conflict ("reload and retry").
- `POST /api/scenario`: session, not a write. `{ seasonId, plantingShiftDays (-30..30), tempAdjustC (-5..5) }`. Runs `runScenario` over the Open-Meteo archive; nothing is saved. 422 when the season has no model, planting date, growth cycle or coordinates; 502 archive failure.
- `GET /api/weather?fieldId=&start=&end=`: session. No dates: 14-day forecast `{ kind: "forecast", data, ...summary }`. Past range: archive. Future range: climate projection (temperature and rainfall only). A range spanning today is 400. Coordinates come from Sanity, never the request. 404 unknown field. No UI calls it yet.
- `GET /api/pests?seasonId=`: session. Regional GBIF sightings within 100 km of the farm for the crop `pestWatch`: `{ scope: "regional", radiusKm, pests[{ pest, sourceId, sourceUrl, date, distanceKm }] }`. 404 missing season, coordinates or `pestWatch`; 502 GBIF failure.
- `POST /api/pests`: session, write. `{ seasonId }`. Stores each sighting as a `pestReport` (`source: gbif`, `scope: regional`, deterministic `_id`, `createIfNotExists`). Returns `{ scope, radiusKm, reports }`.
- `GET|POST /api/advance`: reconciler. POST: session (same-origin) or `Authorization: Bearer <CRON_SECRET>` (no Origin needed); GET: bearer only. With `CRON_SECRET` unset the bearer path is off. Body `{ seasonId? }` (JSON required); without it, all seasons not in `review`. Single season: `advanced` or `unchanged` 200 `{ seasonId, status, stage?, hops?, blockedBy }`, `conflict` 409, `error` 502 (`{ error }` holds the reason); all seasons: 200 `{ outcomes }`. Writes stage, `stageHistory` entries (`effectiveDate`, `basis`, `gddTotal`, `derivedFrom`) and one `weatherSnapshot` per run with `ifRevisionId`. Never writes `actualHarvest` or `yieldAmount`. 20/min per client. No scheduler calls it.

## Not yet ported (Milestone 5)

### `POST /api/webhook/sanity`

Public, signature-verified (`sanity-webhook-signature`, `SANITY_WEBHOOK_SECRET`, checked against the raw body before parsing). Only `_id` is taken from the payload; the pest report is re-read from Sanity. 401 bad signature, 400 bad body, 404 unknown report, 200 `{ skipped }` for severity below high or already assessed, otherwise patches `recommendedAction` with a humidity-aware risk assessment.

## Other Functions

- `GET /api/landing`: public. Weather, soil and GBIF pest summary for the fixed demo site plus USDA PSD, HarvestStat and World Bank yield series. Each source is `{ ok: true, data, fetchedAt }` or `{ ok: false, reason }`. Cached 30 minutes per isolate, `Cache-Control: public, max-age=300`. PSD reads `FAS_API_KEY`; without it PSD is `{ ok: false }`.
- `POST /api/region`: public, same-origin, no body read, 10/min per IP. Brings the stored `regionGrid` document (`region-grid-western-cape`) up to date: advances degree days by at most 14 archive days per call and refetches the 7-day forecast after 3 h; at most one attempt per 2 minutes across isolates (claimed with `ifRevisionId`). Returns 200 `{refreshing: false, reason}` when nothing is due, 202 `{refreshing: true}` when a refresh runs after the response (`waitUntil`). A failed refresh is written to the document's `lastError`. The browser reads the document directly from Sanity.
- `GET /api/conditions?farm=<slug>`: session required. Same site conditions for one farm, located from the farm's Sanity coordinates (slug only, never raw coordinates). 400 bad slug, 404 unknown farm, 422 farm has no coordinates.
