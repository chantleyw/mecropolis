import { createHash, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { cropModelFor } from "@/lib/agronomy/cropModel"
import { accumulateGdd } from "@/lib/agronomy/gdd"
import { env } from "@/lib/env"
import { createRateLimiter } from "@/lib/rateLimit"
import { writeClient } from "@/lib/sanity/writeClient"
import { fetchArchive, summarize, type WeatherSeries } from "@/lib/weather/openmeteo"
import { expectedHarvestDate, seasonWindow } from "@/lib/workflow/effects"
import { planAdvances, seasonPatch } from "@/lib/workflow/reconcile"
import type { SeasonState, TransitionContext } from "@/lib/workflow/types"

const bodySchema = z.object({ seasonId: z.string().min(1).max(200).optional() })

const MIN_COVERAGE = 0.9
const PRE_HARVEST_FRACTION = 0.9
const allow = createRateLimiter(20, 60_000)

const seasonFields = `_id, _rev, stage, plantingDate, expectedHarvest, actualHarvest, yieldAmount,
  derivedMaturityDate,
  "cropId": crop._ref,
  "cropName": crop->name,
  "fieldId": field._ref,
  "growthCycleDays": crop->growthCycleDays,
  "coordinates": field->farm->coordinates{lat, lng},
  "benchmarkResolved": defined(crop->benchmarks.unavailableReason)
    || count(*[_type == "benchmark" && crop._ref == ^.crop._ref]) > 0`

interface SeasonRow {
  _id: string
  _rev: string
  stage: SeasonState["stage"] | null
  plantingDate: string | null
  expectedHarvest: string | null
  actualHarvest: string | null
  yieldAmount: number | null
  derivedMaturityDate: string | null
  cropId: string | null
  cropName: string | null
  fieldId: string | null
  growthCycleDays: number | null
  coordinates: { lat: number | null; lng: number | null } | null
  benchmarkResolved: boolean
}

type Outcome =
  | { seasonId: string; status: "advanced"; stage: string; hops: number; blockedBy: string | null }
  | { seasonId: string; status: "unchanged"; blockedBy: string | null }
  | { seasonId: string; status: "conflict"; reason: string }
  | { seasonId: string; status: "error"; reason: string }

const HTTP_STATUS = { advanced: 200, unchanged: 200, conflict: 409, error: 502 } as const

const failure = (status: number, error: string, reason: string) =>
  NextResponse.json({ success: false, error, reason }, { status })

const digest = (s: string) => createHash("sha256").update(s).digest()

function isScheduler(request: Request): boolean {
  const header = request.headers.get("authorization")
  if (!header?.startsWith("Bearer ")) return false
  return timingSafeEqual(digest(header.slice(7)), digest(env.CRON_SECRET))
}

// Vercel Cron issues GET requests, so GET and POST run the same reconcile.
export async function POST(request: Request) {
  const triggeredBy = isScheduler(request) ? "scheduler" : (await auth())?.user?.name
  if (!triggeredBy) return failure(401, "Unauthorized", "Sign in required")
  if (!allow(triggeredBy)) {
    return failure(429, "Too many requests", "Rate limit exceeded; try again shortly")
  }

  let raw: unknown = {}
  const text = await request.text()
  if (text.trim()) {
    try {
      raw = JSON.parse(text)
    } catch {
      return failure(400, "Invalid body", "Body must be JSON")
    }
  }
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return failure(400, "Invalid body", parsed.error.issues.map((i) => i.message).join("; "))
  }
  return reconcile(parsed.data.seasonId, triggeredBy)
}

export async function GET(request: Request) {
  if (!isScheduler(request)) return failure(401, "Unauthorized", "Bearer token required")
  if (!allow("scheduler")) {
    return failure(429, "Too many requests", "Rate limit exceeded; try again shortly")
  }
  return reconcile(undefined, "scheduler")
}

async function reconcile(seasonId: string | undefined, triggeredBy: string) {
  const rows = await writeClient.fetch<SeasonRow[]>(
    `*[_type == "season" && stage != "review" && (!defined($id) || _id == $id)]{${seasonFields}}`,
    { id: seasonId ?? null },
  )
  if (seasonId && rows.length === 0) return failure(404, "Not found", "Season not found")

  const outcomes: Outcome[] = []
  for (const row of rows) outcomes.push(await advanceSeason(row, triggeredBy))

  const single = seasonId ? outcomes[0] : undefined
  if (single) {
    const success = single.status === "advanced" || single.status === "unchanged"
    return NextResponse.json({ success, ...single }, { status: HTTP_STATUS[single.status] })
  }
  return NextResponse.json({ success: true, outcomes })
}

async function advanceSeason(row: SeasonRow, triggeredBy: string): Promise<Outcome> {
  const seasonId = row._id
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  const season: SeasonState = {
    stage: row.stage ?? "planning",
    cropId: row.cropId,
    plantingDate: row.plantingDate,
    actualHarvest: row.actualHarvest,
    yieldAmount: row.yieldAmount,
    derivedMaturityDate: row.derivedMaturityDate,
  }

  const model = row.cropName ? cropModelFor(row.cropName) : null
  const window =
    season.plantingDate && row.growthCycleDays
      ? seasonWindow(season.plantingDate, row.growthCycleDays, today)
      : null
  const at =
    row.coordinates && row.coordinates.lat !== null && row.coordinates.lng !== null
      ? { lat: row.coordinates.lat, lng: row.coordinates.lng }
      : null

  // One archive fetch per season; a failure is reported and nothing is written.
  let series: WeatherSeries | null = null
  if (model && window && at) {
    try {
      series = await fetchArchive(at.lat, at.lng, window.start, window.end)
    } catch (e) {
      return { seasonId, status: "error", reason: errorMessage(e, "Weather archive fetch failed") }
    }
  }
  const gdd = series && window && model ? accumulateGdd(series.daily, window, model) : null

  const ctx = (seasonArchiveComplete: boolean): TransitionContext => ({
    now,
    notes: "",
    cropModel: model,
    gdd,
    minCoverage: MIN_COVERAGE,
    preHarvestFraction: PRE_HARVEST_FRACTION,
    seasonArchiveComplete,
    benchmarkResolved: row.benchmarkResolved,
  })

  // The archive snapshot is written in this run, so it counts as complete exactly when the
  // archive reaches the maturity crossing.
  const archiveComplete = planAdvances(season, ctx(false)).derivedMaturityDate !== null
  const plan = planAdvances(season, ctx(archiveComplete))

  const fields: Record<string, unknown> = seasonPatch(plan, season)
  if (!row.expectedHarvest && season.plantingDate && row.growthCycleDays) {
    fields.expectedHarvest = expectedHarvestDate(season.plantingDate, row.growthCycleDays)
  }
  if (Object.keys(fields).length === 0) {
    return { seasonId, status: "unchanged", blockedBy: plan.blockedBy }
  }

  // One weatherSnapshot per run, shared by every hop.
  let snapshotId: string | null = null
  const tx = writeClient.transaction()
  if (series && row.fieldId && plan.hops.length > 0) {
    try {
      const summarized = summarize(series)
      snapshotId = `weatherSnapshot.${crypto.randomUUID()}`
      tx.create({
        _id: snapshotId,
        _type: "weatherSnapshot",
        field: { _type: "reference", _ref: row.fieldId },
        season: { _type: "reference", _ref: seasonId },
        fetchedAt: now.toISOString(),
        triggeredBy: "reconcile",
        data: JSON.stringify(series),
        summary: summarized.summary,
        period: summarized.period,
      })
    } catch (e) {
      return { seasonId, status: "error", reason: errorMessage(e, "Weather summary failed") }
    }
  }

  const entries = plan.hops.map((hop) => ({
    _key: crypto.randomUUID(),
    _type: "stageChange",
    stage: hop.to,
    previousStage: hop.from,
    timestamp: now.toISOString(),
    triggeredBy,
    effectiveDate: hop.effectiveDate,
    basis: hop.basis,
    derivedFrom: hop.derivedFrom,
    ...(hop.gddTotal !== null ? { gddTotal: hop.gddTotal } : {}),
    ...(snapshotId ? { weatherFetched: true, weatherSnapshotId: snapshotId } : {}),
  }))

  // ifRevisionId makes a concurrent change fail instead of being overwritten.
  tx.patch(seasonId, (p) => {
    const patch = p.ifRevisionId(row._rev).set(fields)
    return entries.length > 0
      ? patch.setIfMissing({ stageHistory: [] }).append("stageHistory", entries)
      : patch
  })

  try {
    await tx.commit()
  } catch (e) {
    if (isRevisionConflict(e)) {
      return { seasonId, status: "conflict", reason: "Season changed during reconcile; retry" }
    }
    return { seasonId, status: "error", reason: errorMessage(e, "Sanity write failed") }
  }

  const stage = plan.hops.at(-1)?.to ?? season.stage
  return { seasonId, status: "advanced", stage, hops: plan.hops.length, blockedBy: plan.blockedBy }
}

const errorMessage = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)

function isRevisionConflict(e: unknown): boolean {
  return typeof e === "object" && e !== null && "statusCode" in e && e.statusCode === 409
}
