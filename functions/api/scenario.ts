import { z } from "zod"

import { runScenario } from "../../src/lib/agronomy/scenario"
import { createRateLimiter } from "../../src/lib/rateLimit"
import { fetchArchive } from "../../src/lib/weather/openmeteo"
import { SEASON_FIELDS, seasonInputs, type SeasonRow } from "../../src/lib/workflow/context"
import { parseEnv } from "../_lib/env"
import { docId, errorResponse, guard, issues, json, readJsonBody } from "../_lib/http"
import { readClient } from "../_lib/sanity"

const allow = createRateLimiter(20, 60_000)

const bodySchema = z.object({
  seasonId: docId,
  plantingShiftDays: z.number().int().min(-30).max(30),
  tempAdjustC: z.number().min(-5).max(5),
})

// Ephemeral calculation over observed weather; nothing is written, so no same-origin check.
export const onRequestPost: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  const authz = await guard(request, env, allow, { write: false })
  if (!authz.ok) return authz.response
  const raw = await readJsonBody(request)
  if (!raw.ok) return raw.response
  const parsed = bodySchema.safeParse(raw.value)
  if (!parsed.success) return errorResponse(400, issues(parsed.error))
  const { seasonId, plantingShiftDays, tempAdjustC } = parsed.data

  const row = await readClient(env).fetch<SeasonRow | null>(
    `*[_type == "season" && _id == $id][0]{${SEASON_FIELDS}}`,
    { id: seasonId },
  )
  if (!row) return errorResponse(404, "Season not found")

  const { season, model, window, at } = seasonInputs(row, new Date().toISOString().slice(0, 10))
  if (!model) return errorResponse(422, "No GDD model for this crop")
  if (!season.plantingDate || !row.growthCycleDays) {
    return errorResponse(422, "Planting date or growth cycle is not set")
  }
  if (!at) return errorResponse(422, "No coordinates for this field")
  if (!window) return errorResponse(422, "Planting date is in the future")

  let series
  try {
    series = await fetchArchive(at.lat, at.lng, window.start, window.end)
  } catch (e) {
    return errorResponse(
      502,
      `Weather archive unavailable: ${e instanceof Error ? e.message : "fetch failed"}`,
    )
  }
  return json(runScenario({ daily: series.daily, window, model, plantingShiftDays, tempAdjustC }))
}
