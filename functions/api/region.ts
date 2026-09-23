import { createRateLimiter } from "../../src/lib/rateLimit"
import {
  advanceArchive,
  nextWindow,
  REGION_GRID_ID,
  refreshForecast,
  seasonStart,
  startGrid,
  type RegionGrid,
} from "../../src/lib/public/regionGrid"
import { parseEnv } from "../_lib/env"
import { clientIp, errorResponse, json, sameOrigin } from "../_lib/http"
import { writeClient } from "../_lib/sanity"

const allow = createRateLimiter(10, 60_000)
// Shared across isolates through the document itself: one attempt per 2 minutes, forecast
// refetched after 3 hours, archive advanced whenever it is behind yesterday.
const MIN_ATTEMPT_GAP_MS = 2 * 60_000
const FORECAST_TTL_MS = 3 * 60 * 60_000

type Stored = RegionGrid & { _id: string; _rev: string }

// Brings the stored Western Cape grid up to date. Public (the landing page calls it on load) but
// takes no input: it can only fetch the fixed grid and write the one document. Visitors read the
// document straight from Sanity, so the refresh runs after the response and reaches them through
// the real-time listener.
export const onRequestPost: PagesFunction = async ({ request, env: rawEnv, waitUntil }) => {
  const env = parseEnv(rawEnv)
  if (!sameOrigin(request)) return errorResponse(403, "Cross-origin request rejected")
  const ip = clientIp(request)
  if (!ip) return errorResponse(400, "Missing client address")
  if (!allow(ip)) return errorResponse(429, "Too many requests, slow down")

  const client = writeClient(env)
  const now = new Date()
  const doc = await client.getDocument<Stored>(REGION_GRID_ID)
  const sameSeason = doc?.seasonStart === seasonStart(now) && doc.cells.length > 0
  const forecastStale =
    !doc?.forecastAt || now.getTime() - Date.parse(doc.forecastAt) > FORECAST_TTL_MS
  if (doc && sameSeason && !nextWindow(doc, now) && !forecastStale)
    return json({ refreshing: false, reason: "Up to date" })
  if (doc?.lastAttemptAt && now.getTime() - Date.parse(doc.lastAttemptAt) < MIN_ATTEMPT_GAP_MS)
    return json({ refreshing: false, reason: "A refresh started less than 2 minutes ago" })

  // Claim the attempt. The revision check makes a concurrent claim fail instead of adding the
  // same days twice.
  let rev: string
  try {
    const claimed = doc
      ? await client
          .patch(REGION_GRID_ID)
          .ifRevisionId(doc._rev)
          .set({ lastAttemptAt: now.toISOString() })
          .commit()
      : await client.create({
          _id: REGION_GRID_ID,
          _type: "regionGrid",
          seasonStart: seasonStart(now),
          throughDate: seasonStart(now),
          lastAttemptAt: now.toISOString(),
          cells: [],
        })
    rev = claimed._rev
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode
    if (status === 409) return json({ refreshing: false, reason: "Another refresh is running" })
    throw e
  }

  waitUntil(
    (async () => {
      const set = (fields: Record<string, unknown>) =>
        client.patch(REGION_GRID_ID).ifRevisionId(rev).set(fields).commit()
      try {
        let grid: RegionGrid = doc && sameSeason ? doc : await startGrid(now)
        const before = grid.throughDate
        grid = await advanceArchive(grid, now)
        const withForecast = forecastStale ? await refreshForecast(grid) : grid
        await client
          .patch(REGION_GRID_ID)
          .ifRevisionId(rev)
          .set({
            seasonStart: withForecast.seasonStart,
            throughDate: withForecast.throughDate,
            cells: withForecast.cells.map((c, i) => ({ _key: `c${i}`, _type: "regionCell", ...c })),
            ...(withForecast.throughDate !== before || !sameSeason
              ? { archiveUpdatedAt: new Date().toISOString() }
              : {}),
            ...(forecastStale ? { forecastAt: new Date().toISOString() } : {}),
          })
          .unset(["lastError"])
          .commit()
      } catch (e) {
        // Recorded on the document, which the landing page shows beside the map.
        await set({ lastError: e instanceof Error ? e.message : String(e) })
      }
    })(),
  )
  return json({ refreshing: true }, 202)
}
