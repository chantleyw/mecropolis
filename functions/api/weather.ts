import { z } from "zod"

import { isRealDate } from "../../src/lib/fieldLog"
import { createRateLimiter } from "../../src/lib/rateLimit"
import { fetchProjection } from "../../src/lib/weather/climate"
import { fetchArchive, fetchForecast, summarize } from "../../src/lib/weather/openmeteo"
import { parseEnv } from "../_lib/env"
import { docId, errorResponse, guard, issues, json } from "../_lib/http"
import { readClient } from "../_lib/sanity"

const allow = createRateLimiter(30, 60_000)
// One season at most: a longer range is a large upstream fetch against the shared Open-Meteo quota.
export const MAX_RANGE_DAYS = 366
const DAY_MS = 86_400_000

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isRealDate, "not a real date")

const querySchema = z
  .object({ fieldId: docId, start: isoDate.optional(), end: isoDate.optional() })
  .refine((q) => (q.start === undefined) === (q.end === undefined), {
    message: "start and end must be given together",
  })
  .refine((q) => !q.start || !q.end || q.start <= q.end, {
    message: "start must not be after end",
  })
  .refine(
    (q) =>
      !q.start ||
      !q.end ||
      Date.parse(`${q.end}T00:00:00Z`) - Date.parse(`${q.start}T00:00:00Z`) <
        MAX_RANGE_DAYS * DAY_MS,
    { message: `range must be at most ${MAX_RANGE_DAYS} days` },
  )

// Forecast (no range), archive (past range) or climate projection (future range) for a field.
// Takes a field id, not coordinates, so callers only reach locations stored in Sanity.
export const onRequestGet: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  const authz = await guard(request, env, allow, { write: false })
  if (!authz.ok) return authz.response

  const params = new URL(request.url).searchParams
  const parsed = querySchema.safeParse({
    fieldId: params.get("fieldId") ?? undefined,
    start: params.get("start") ?? undefined,
    end: params.get("end") ?? undefined,
  })
  if (!parsed.success) return errorResponse(400, issues(parsed.error))
  const { fieldId, start, end } = parsed.data

  const coords = await readClient(env).fetch<{ lat: number | null; lng: number | null } | null>(
    `*[_type == "field" && _id == $id][0]{
      "c": select(defined(coordinates) => coordinates{lat, lng}, farm->coordinates{lat, lng})
    }.c`,
    { id: fieldId },
  )
  if (!coords || coords.lat === null || coords.lng === null) {
    return errorResponse(404, "Field or farm coordinates not found")
  }

  const today = new Date().toISOString().slice(0, 10)
  if (start && end && start <= today && end > today) {
    return errorResponse(400, "Range must be entirely past or entirely future")
  }
  try {
    if (!start || !end) {
      const series = await fetchForecast(coords.lat, coords.lng, 14)
      return json({ kind: "forecast", data: series, ...summarize(series) })
    }
    if (end <= today) {
      const series = await fetchArchive(coords.lat, coords.lng, start, end)
      return json({ kind: "archive", data: series, ...summarize(series) })
    }
    const projection = await fetchProjection(coords.lat, coords.lng, start, end)
    return json({ kind: "projection", data: null, ...projection })
  } catch (e) {
    return errorResponse(502, e instanceof Error ? e.message : "Weather fetch failed")
  }
}
