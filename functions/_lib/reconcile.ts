import { accumulateGdd } from "../../src/lib/agronomy/gdd"
import { fetchArchive, summarize, type WeatherSeries } from "../../src/lib/weather/openmeteo"
import {
  SEASON_FIELDS,
  seasonInputs,
  transitionContext,
  type SeasonRow,
} from "../../src/lib/workflow/context"
import { expectedHarvestDate } from "../../src/lib/workflow/effects"
import { planAdvances, seasonPatch } from "../../src/lib/workflow/reconcile"
import type { Env } from "./env"
import { errorResponse, json } from "./http"
import { isRevisionConflict, writeClient } from "./sanity"

export type Outcome =
  | { seasonId: string; status: "advanced"; stage: string; hops: number; blockedBy: string | null }
  | { seasonId: string; status: "unchanged"; blockedBy: string | null }
  | { seasonId: string; status: "conflict"; reason: string }
  | { seasonId: string; status: "error"; reason: string }

const HTTP_STATUS = { advanced: 200, unchanged: 200, conflict: 409, error: 502 } as const

// Reconciles one season, or every non-review season when seasonId is undefined. Shared by
// /api/advance (session or scheduler) and the Sanity webhook.
export async function reconcile(env: Env, seasonId: string | undefined, triggeredBy: string) {
  const client = writeClient(env)
  const rows = await client.fetch<SeasonRow[]>(
    `*[_type == "season" && stage != "review" && (!defined($id) || _id == $id)]{${SEASON_FIELDS}}`,
    { id: seasonId ?? null },
  )
  if (seasonId && rows.length === 0) return errorResponse(404, "Season not found")

  const outcomes: Outcome[] = []
  for (const row of rows) outcomes.push(await advanceSeason(env, row, triggeredBy))

  const single = seasonId ? outcomes[0] : undefined
  if (!single) return json({ outcomes })
  if (single.status === "conflict" || single.status === "error") {
    return json({ ...single, error: single.reason }, HTTP_STATUS[single.status])
  }
  return json(single)
}

async function advanceSeason(env: Env, row: SeasonRow, triggeredBy: string): Promise<Outcome> {
  const seasonId = row._id
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  const { season, model, window, at } = seasonInputs(row, today)

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

  const ctx = (seasonArchiveComplete: boolean) =>
    transitionContext(row, model, gdd, now, seasonArchiveComplete)

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
  const tx = writeClient(env).transaction()
  if (series && row.fieldId && plan.hops.length > 0) {
    const summarized = summarize(series)
    snapshotId = `weatherSnapshot-${crypto.randomUUID()}`
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
