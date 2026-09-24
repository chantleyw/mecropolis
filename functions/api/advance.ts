import { z } from "zod"

import { accumulateGdd } from "../../src/lib/agronomy/gdd"
import { createRateLimiter } from "../../src/lib/rateLimit"
import { fetchArchive, summarize, type WeatherSeries } from "../../src/lib/weather/openmeteo"
import {
  SEASON_FIELDS,
  seasonInputs,
  transitionContext,
  type SeasonRow,
} from "../../src/lib/workflow/context"
import { expectedHarvestDate } from "../../src/lib/workflow/effects"
import { planAdvances, seasonPatch } from "../../src/lib/workflow/reconcile"
import { safeEqual } from "../_lib/crypto"
import { parseEnv, type Env } from "../_lib/env"
import {
  clientIp,
  docId,
  errorResponse,
  getSession,
  issues,
  json,
  readJsonBody,
  sameOrigin,
} from "../_lib/http"
import { isRevisionConflict, writeClient } from "../_lib/sanity"

const allow = createRateLimiter(20, 60_000)

const bodySchema = z.object({ seasonId: docId.optional() })

type Outcome =
  | { seasonId: string; status: "advanced"; stage: string; hops: number; blockedBy: string | null }
  | { seasonId: string; status: "unchanged"; blockedBy: string | null }
  | { seasonId: string; status: "conflict"; reason: string }
  | { seasonId: string; status: "error"; reason: string }

const HTTP_STATUS = { advanced: 200, unchanged: 200, conflict: 409, error: 502 } as const

async function isScheduler(request: Request, env: Env): Promise<boolean> {
  const header = request.headers.get("authorization")
  if (!env.CRON_SECRET || !header?.startsWith("Bearer ")) return false
  return safeEqual(header.slice(7), env.CRON_SECRET)
}

// Walks seasons forward from planting date and GDD. A signed-in user (same-origin) reconciles one
// season and must send `seasonId`; a scheduler with `Authorization: Bearer CRON_SECRET` may omit it
// to walk every season. GET is scheduler only.
export const onRequestPost: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  let triggeredBy: string
  if (await isScheduler(request, env)) {
    triggeredBy = "scheduler"
  } else {
    if (!sameOrigin(request)) return errorResponse(403, "Cross-origin request rejected")
    const session = await getSession(request, env)
    if (!session) return errorResponse(401, "Sign in required")
    triggeredBy = session.user
  }
  const key = triggeredBy === "scheduler" ? "scheduler" : clientIp(request)
  if (!key) return errorResponse(400, "Missing client address")
  if (!allow(key)) return errorResponse(429, "Too many requests, slow down")

  const raw = await readJsonBody(request)
  if (!raw.ok) return raw.response
  const parsed = bodySchema.safeParse(raw.value)
  if (!parsed.success) return errorResponse(400, issues(parsed.error))
  if (!parsed.data.seasonId && triggeredBy !== "scheduler") {
    return errorResponse(400, "seasonId is required")
  }
  return reconcile(env, parsed.data.seasonId, triggeredBy)
}

export const onRequestGet: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  if (!(await isScheduler(request, env))) return errorResponse(401, "Bearer token required")
  if (!allow("scheduler")) return errorResponse(429, "Too many requests, slow down")
  return reconcile(env, undefined, "scheduler")
}

async function reconcile(env: Env, seasonId: string | undefined, triggeredBy: string) {
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
