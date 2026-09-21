import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { fetchPestOccurrences } from "@/lib/data/gbif"
import { pestReportDoc, toRegionalPests, type RegionalPest } from "@/lib/pests/regional"
import { createRateLimiter } from "@/lib/rateLimit"
import { writeClient } from "@/lib/sanity/writeClient"

const allow = createRateLimiter(20, 60_000)

const RADIUS_KM = 100
const PER_PEST_LIMIT = 20

const querySchema = z.object({ seasonId: z.string().min(1).max(200) })

const seasonQuery = `*[_type == "season" && _id == $id][0]{
  "fieldId": field._ref,
  "coordinates": field->farm->coordinates{lat, lng},
  "pestWatch": crop->pestWatch[]{pest, gbifTaxonKey}
}`

interface SeasonRow {
  fieldId: string | null
  coordinates: { lat: number | null; lng: number | null } | null
  pestWatch: { pest: string | null; gbifTaxonKey: number | null }[] | null
}

const fail = (status: number, error: string) => NextResponse.json({ error }, { status })

type Loaded =
  | { ok: true; seasonId: string; fieldId: string; pests: RegionalPest[] }
  | { ok: false; response: NextResponse }

// Regional sightings (GBIF, within RADIUS_KM of the farm) for the pests the season's crop watches.
async function loadRegionalPests(seasonId: string | null): Promise<Loaded> {
  const session = await auth()
  const user = session?.user?.name
  if (!user) return { ok: false, response: fail(401, "Sign in required") }
  if (!allow(user))
    return { ok: false, response: fail(429, "Rate limit exceeded; try again shortly") }

  const parsed = querySchema.safeParse({ seasonId: seasonId ?? undefined })
  if (!parsed.success) {
    return { ok: false, response: fail(400, parsed.error.issues.map((i) => i.message).join("; ")) }
  }

  const season = await writeClient.fetch<SeasonRow | null>(seasonQuery, {
    id: parsed.data.seasonId,
  })
  if (!season?.fieldId) return { ok: false, response: fail(404, "Season or field not found") }
  const { lat, lng } = season.coordinates ?? {}
  if (lat == null || lng == null) {
    return { ok: false, response: fail(404, "Farm coordinates not set") }
  }
  const watch = (season.pestWatch ?? []).filter((w) => w.pest)
  if (watch.length === 0) {
    return { ok: false, response: fail(404, "This crop has no pestWatch entries") }
  }

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
      seasonId: parsed.data.seasonId,
      fieldId: season.fieldId,
      pests: perPest.flat().sort((a, b) => a.distanceKm - b.distanceKm),
    }
  } catch {
    return { ok: false, response: fail(502, "GBIF request failed") }
  }
}

// Read-only: regional sightings near the season's field.
export async function GET(request: Request) {
  const seasonId = new URL(request.url).searchParams.get("seasonId")
  const loaded = await loadRegionalPests(seasonId)
  if (!loaded.ok) return loaded.response
  return NextResponse.json({ scope: "regional", radiusKm: RADIUS_KM, pests: loaded.pests })
}

// Stores the sightings as regional pestReport documents. Existing reports are left untouched.
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null)
  const seasonId =
    typeof body === "object" && body !== null && "seasonId" in body
      ? String((body as { seasonId: unknown }).seasonId)
      : null
  const loaded = await loadRegionalPests(seasonId)
  if (!loaded.ok) return loaded.response

  try {
    const tx = writeClient.transaction()
    for (const p of loaded.pests) {
      tx.createIfNotExists(pestReportDoc(loaded.seasonId, loaded.fieldId, p))
    }
    await tx.commit()
  } catch {
    return fail(502, "Could not write pest reports")
  }
  return NextResponse.json({ scope: "regional", radiusKm: RADIUS_KM, reports: loaded.pests.length })
}
