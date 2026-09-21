import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { createRateLimiter } from "@/lib/rateLimit"
import { writeClient } from "@/lib/sanity/writeClient"
import { runWeatherPlan, type Coordinates } from "@/lib/weather/snapshot"
import { expectedHarvestDate, weatherPlanFor } from "@/lib/workflow/effects"
import { evaluate } from "@/lib/workflow/guards"
import { STAGES, type SeasonState } from "@/lib/workflow/types"

const bodySchema = z.object({
  seasonId: z.string().min(1).max(200),
  targetStage: z.enum(STAGES),
  notes: z.string().max(1000).optional(),
})

const MIN_DAYS_TO_GROWING = 7
const allow = createRateLimiter(20, 60_000)

const seasonQuery = `*[_type == "season" && _id == $id][0]{
  _id, _rev, stage, plantingDate, expectedHarvest, actualHarvest, yieldAmount,
  "cropId": crop._ref,
  "fieldId": field._ref,
  "growthCycleDays": crop->growthCycleDays,
  "coordinates": field->farm->coordinates{lat, lng},
  "treatmentCount": count(*[_type == "treatment" && season._ref == ^._id])
}`

interface SeasonRow {
  _id: string
  _rev: string
  stage: SeasonState["stage"] | null
  plantingDate: string | null
  expectedHarvest: string | null
  actualHarvest: string | null
  yieldAmount: number | null
  cropId: string | null
  fieldId: string | null
  growthCycleDays: number | null
  coordinates: { lat: number | null; lng: number | null } | null
  treatmentCount: number
}

const failure = (status: number, error: string, reason: string, currentStage?: string) =>
  NextResponse.json({ success: false, error, reason, currentStage }, { status })

export async function POST(request: Request) {
  const session = await auth()
  const triggeredBy = session?.user?.name
  if (!triggeredBy) return failure(401, "Unauthorized", "Sign in required")

  if (!allow(triggeredBy)) {
    return failure(429, "Too many requests", "Rate limit exceeded; try again shortly")
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return failure(400, "Invalid body", "Body must be JSON")
  }
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return failure(400, "Invalid body", parsed.error.issues.map((i) => i.message).join("; "))
  }
  const { seasonId, targetStage } = parsed.data
  const notes = parsed.data.notes ?? ""

  const row = await writeClient.fetch<SeasonRow | null>(seasonQuery, { id: seasonId })
  if (!row) return failure(404, "Not found", "Season not found")

  const season: SeasonState = {
    stage: row.stage ?? "planning",
    cropId: row.cropId,
    plantingDate: row.plantingDate,
    actualHarvest: row.actualHarvest,
    yieldAmount: row.yieldAmount,
  }

  const result = evaluate(season, targetStage, {
    now: new Date(),
    treatmentCount: row.treatmentCount,
    notes,
    minDaysToGrowing: MIN_DAYS_TO_GROWING,
  })
  if (!result.ok) {
    const error = result.kind === "guard-failed" ? "Guard failed" : "Invalid transition"
    return failure(400, error, result.reason, season.stage)
  }

  const now = new Date()
  const from = season.stage
  const plan = weatherPlanFor(from, targetStage, {
    plantingDate: season.plantingDate,
    actualHarvest: season.actualHarvest,
    today: now.toISOString().slice(0, 10),
  })

  // Run the effect first so the history entry and snapshot commit together. A failed fetch
  // degrades to weatherFetched: false and is reported in the response, never hidden.
  let snapshot: { _id: string; doc: Record<string, unknown>; summary: unknown } | null = null
  let weatherError: string | undefined
  if (plan) {
    const at = toCoordinates(row.coordinates)
    if (!at || !row.fieldId) {
      weatherError = "Farm coordinates are not set"
    } else {
      try {
        const result = await runWeatherPlan(plan, at)
        const _id = `weatherSnapshot.${crypto.randomUUID()}`
        snapshot = {
          _id,
          summary: result.summary,
          doc: {
            _id,
            _type: "weatherSnapshot",
            field: { _type: "reference", _ref: row.fieldId },
            season: { _type: "reference", _ref: seasonId },
            fetchedAt: now.toISOString(),
            triggeredBy: `${from}-to-${targetStage}`,
            ...(plan.kind === "forecast" ? { forecastDays: plan.forecastDays } : {}),
            data: JSON.stringify(result.series),
            summary: result.summary,
            period: result.period,
          },
        }
      } catch (e) {
        weatherError = e instanceof Error ? e.message : "Weather fetch failed"
      }
    }
  }

  const entry = {
    _key: crypto.randomUUID(),
    _type: "stageChange",
    stage: targetStage,
    previousStage: from,
    timestamp: now.toISOString(),
    triggeredBy,
    ...(notes.trim() ? { notes: notes.trim() } : {}),
    ...(plan ? { weatherFetched: snapshot !== null } : {}),
    ...(snapshot ? { weatherSnapshotId: snapshot._id } : {}),
  }

  const fields: Record<string, unknown> = { stage: targetStage }
  if (!row.expectedHarvest && season.plantingDate && row.growthCycleDays) {
    fields.expectedHarvest = expectedHarvestDate(season.plantingDate, row.growthCycleDays)
  }

  // ifRevisionId makes a concurrent change fail instead of being overwritten.
  const tx = writeClient.transaction()
  if (snapshot) tx.create(snapshot.doc as { _id: string; _type: string })
  tx.patch(seasonId, (p) =>
    p
      .ifRevisionId(row._rev)
      .set(fields)
      .setIfMissing({ stageHistory: [] })
      .append("stageHistory", [entry]),
  )
  const updated = await tx
    .commit<{ _id: string; stage: string; stageHistory: unknown[] }>({ returnDocuments: true })
    .then((docs) => docs.find((d) => d._id === seasonId) ?? null)
    .catch((e: unknown) => {
      if (isRevisionConflict(e)) return "conflict" as const
      throw e
    })

  if (updated === "conflict") {
    return failure(
      409,
      "Conflict",
      "Season changed while transitioning; reload and retry",
      season.stage,
    )
  }

  return NextResponse.json({
    success: true,
    season: updated,
    weatherSnapshot: snapshot ? { _id: snapshot._id, summary: snapshot.summary } : null,
    ...(weatherError ? { weatherError } : {}),
    message: `Season advanced to ${targetStage}`,
  })
}

function isRevisionConflict(e: unknown): boolean {
  return typeof e === "object" && e !== null && "statusCode" in e && e.statusCode === 409
}

function toCoordinates(c: SeasonRow["coordinates"]): Coordinates | null {
  return c && c.lat !== null && c.lng !== null ? { lat: c.lat, lng: c.lng } : null
}
