import { checkTransition } from "./machine"
import type { Guard, GuardResult, Stage, SeasonState, TransitionContext } from "./types"

const DAY_MS = 86_400_000

const ok: GuardResult = { valid: true }
const fail = (reason: string): GuardResult => ({ valid: false, reason })

function daysSince(date: string, now: Date): number {
  return Math.floor((now.getTime() - Date.parse(`${date}T00:00:00Z`)) / DAY_MS)
}

const planned: Guard = (season) => {
  if (!season.plantingDate) return fail("plantingDate must be set before transitioning to planted")
  if (!season.cropId) return fail("crop must be set before transitioning to planted")
  return ok
}

const established: Guard = (season, ctx) => {
  if (!season.plantingDate) return fail("plantingDate must be set before transitioning to growing")
  const days = daysSince(season.plantingDate, ctx.now)
  if (days < ctx.minDaysToGrowing) {
    return fail(
      `At least ${ctx.minDaysToGrowing} days must pass since plantingDate; ${Math.max(days, 0)} so far`,
    )
  }
  return ok
}

const treated: Guard = (_season, ctx) =>
  ctx.treatmentCount > 0
    ? ok
    : fail("At least one treatment must be logged before transitioning to pre-harvest")

const harvestDated: Guard = (season) =>
  season.actualHarvest ? ok : fail("actualHarvest must be set before transitioning to harvested")

const yielded: Guard = (season) =>
  season.yieldAmount !== null
    ? ok
    : fail("yieldAmount must be filled before transitioning to review")

const rejected: Guard = (_season, ctx) =>
  ctx.notes.trim().length > 0
    ? ok
    : fail("A reason in notes is required to send a season back to growing")

const GUARDS: Record<string, readonly Guard[]> = {
  "planning->planted": [planned],
  "planted->growing": [established],
  "growing->pre-harvest": [treated],
  "pre-harvest->harvested": [harvestDated],
  "harvested->review": [yielded],
  "pre-harvest->growing": [rejected],
}

export type Evaluation =
  { ok: true } | { ok: false; kind: "invalid-transition" | "guard-failed"; reason: string }

/** Machine validity first, then every guard; returns the first failure. */
export function evaluate(season: SeasonState, to: Stage, ctx: TransitionContext): Evaluation {
  const check = checkTransition(season.stage, to)
  if (!check.valid) return { ok: false, kind: "invalid-transition", reason: check.reason }
  for (const guard of GUARDS[`${season.stage}->${to}`] ?? []) {
    const result = guard(season, ctx)
    if (!result.valid) return { ok: false, kind: "guard-failed", reason: result.reason }
  }
  return { ok: true }
}
