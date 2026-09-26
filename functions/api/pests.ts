import { z } from "zod"

import { fetchPestOccurrences } from "../../src/lib/data/gbif"
import { pestReportDoc, toRegionalPests, type RegionalPest } from "../../src/lib/pests/regional"
import { createRateLimiter } from "../../src/lib/rateLimit"
import { parseEnv, type Env } from "../_lib/env"
import { docId, errorResponse, guard, issues, json, readJsonBody } from "../_lib/http"
import { readClient, writeClient } from "../_lib/sanity"

const allow = createRateLimiter(20, 60_000)

const RADIUS_KM = 100
const PER_PEST_LIMIT = 20
// Global hourly cap on stored reports, counted in Sanity; the per-isolate IP limiter alone does not
// bound total writes.
const STORES_PER_HOUR = 200

const seasonSchema = z.object({ seasonId: docId })

const seasonQuery = `*[_type == "season" && _id == $id][0]{
  "fieldId": field._ref,
  "coordinates": select(defined(field->coordinates) => field->coordinates{lat, lng}, field->farm->coordinates{lat, lng}),
  "pestWatch": crop->pestWatch[]{pest, gbifTaxonKey}
}`

interface SeasonRow {
  fieldId: string | null
  coordinates: { lat: number | null; lng: number | null } | null
  pestWatch: { pest: string | null; gbifTaxonKey: number | null }[] | null
}

type Loaded =
  | { ok: true; seasonId: string; fieldId: string; pests: RegionalPest[] }
  | { ok: false; response: Response }

const fail = (status: number, message: string): Loaded => ({
  ok: false,
  response: errorResponse(status, message),
})

// Regional sightings (GBIF, within RADIUS_KM of the farm) for the pests the season's crop watches.
async function loadRegionalPests(env: Env, seasonId: string): Promise<Loaded> {
  const season = await readClient(env).fetch<SeasonRow | null>(seasonQuery, { id: seasonId })
  if (!season?.fieldId) return fail(404, "Season or field not found")
  const { lat, lng } = season.coordinates ?? {}
  if (lat == null || lng == null) return fail(404, "Farm coordinates not set")
  const watch = (season.pestWatch ?? []).filter((w) => w.pest)
  if (watch.length === 0) return fail(404, "This crop has no pestWatch entries")

  const centre = { lat, lng }
  try {
    const perPest = await Promise.all(
      watch.map(async (w) => {
        const occurrences = await fetchPestOccurrences(
          w.gbifTaxonKey != null ? { taxonKey: w.gbifTaxonKey } : { scientificName: w.pest ?? "" },
          centre,
          RADIUS_KM,
          PER_PEST_LIMIT,
        )
        return toRegionalPests(w.pest ?? "", occurrences, centre)
      }),
    )
    return {
      ok: true,
      seasonId,
      fieldId: season.fieldId,
      pests: perPest.flat().sort((a, b) => a.distanceKm - b.distanceKm),
    }
  } catch (e) {
    return fail(502, `GBIF request failed: ${e instanceof Error ? e.message : "fetch failed"}`)
  }
}

// Read-only: regional sightings near the season's field.
export const onRequestGet: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  const authz = await guard(request, env, allow, { write: false })
  if (!authz.ok) return authz.response
  const parsed = seasonSchema.safeParse({
    seasonId: new URL(request.url).searchParams.get("seasonId") ?? undefined,
  })
  if (!parsed.success) return errorResponse(400, issues(parsed.error))

  const loaded = await loadRegionalPests(env, parsed.data.seasonId)
  if (!loaded.ok) return loaded.response
  return json({ scope: "regional", radiusKm: RADIUS_KM, pests: loaded.pests })
}

// Stores the sightings as regional pestReport documents. Existing reports are left untouched.
export const onRequestPost: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  const authz = await guard(request, env, allow, { write: true })
  if (!authz.ok) return authz.response
  const raw = await readJsonBody(request)
  if (!raw.ok) return raw.response
  const parsed = seasonSchema.safeParse(raw.value)
  if (!parsed.success) return errorResponse(400, issues(parsed.error))

  const recent = await writeClient(env).fetch<number>(
    `count(*[_type == "pestReport" && dateTime(_createdAt) > dateTime($since)])`,
    { since: new Date(Date.now() - 3_600_000).toISOString() },
  )
  if (recent >= STORES_PER_HOUR) {
    return errorResponse(429, "Pest report limit reached for this hour, try again later")
  }

  const loaded = await loadRegionalPests(env, parsed.data.seasonId)
  if (!loaded.ok) return loaded.response
  // One store can hold up to pestWatch x PER_PEST_LIMIT reports, so the batch is trimmed to what
  // is left of the hourly cap (nearest sightings first).
  const batch = loaded.pests.slice(0, STORES_PER_HOUR - recent)
  if (batch.length > 0) {
    const tx = writeClient(env).transaction()
    for (const p of batch) tx.createIfNotExists(pestReportDoc(loaded.seasonId, loaded.fieldId, p))
    await tx.commit()
  }
  return json({ scope: "regional", radiusKm: RADIUS_KM, reports: batch.length })
}
