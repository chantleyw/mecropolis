import type { CropModel } from "@/lib/agronomy/cropModel"
import type { GddAccumulation } from "@/lib/agronomy/gdd"
import { checkTransition } from "./machine"
import type { Guard, GuardResult, SeasonState, Stage, TransitionContext } from "./types"

const ok: GuardResult = { valid: true }
const fail = (reason: string) => ({ valid: false as const, reason })

const pct = (n: number) => `${Math.round(n * 100)}%`
const round1 = (n: number) => Math.round(n * 10) / 10

/** Shared precondition of the GDD guards: a crop model and enough temperature data. */
function gddInputs(
  ctx: TransitionContext,
  target: string,
): { model: CropModel; gdd: GddAccumulation } | { valid: false; reason: string } {
  if (!ctx.cropModel) return fail(`No crop model for this crop; cannot evaluate ${target}`)
  if (!ctx.gdd) return fail(`No temperature data available; cannot evaluate ${target}`)
  if (ctx.gdd.coverage < ctx.minCoverage) {
    return fail(
      `Temperature coverage ${pct(ctx.gdd.coverage)} (${ctx.gdd.daysWithData} of ` +
        `${ctx.gdd.daysInWindow} days) is below the required ${pct(ctx.minCoverage)}`,
    )
  }
  return { model: ctx.cropModel, gdd: ctx.gdd }
}

const planned: Guard = (season) => {
  if (!season.plantingDate) return fail("plantingDate must be set before transitioning to planted")
  if (!season.cropId) return fail("crop must be set before transitioning to planted")
  return ok
}

const emerged: Guard = (_season, ctx) => {
  const inputs = gddInputs(ctx, "emergence")
  if ("valid" in inputs) return inputs
  const { model, gdd } = inputs
  return gdd.total >= model.gddToEmergence
    ? ok
    : fail(
        `Accumulated ${round1(gdd.total)} GDD is below the ${model.gddToEmergence} GDD needed for emergence`,
      )
}

const maturing: Guard = (_season, ctx) => {
  const inputs = gddInputs(ctx, "pre-harvest")
  if ("valid" in inputs) return inputs
  const { model, gdd } = inputs
  const threshold = model.gddToMaturity * ctx.preHarvestFraction
  return gdd.total >= threshold
    ? ok
    : fail(
        `Accumulated ${round1(gdd.total)} GDD is below the ${round1(threshold)} GDD ` +
          `(${pct(ctx.preHarvestFraction)} of ${model.gddToMaturity}) needed for pre-harvest`,
      )
}

const matured: Guard = (season, ctx) => {
  if (season.derivedMaturityDate) return ok
  if (!ctx.cropModel) return fail("No crop model for this crop; cannot evaluate maturity")
  if (!ctx.gdd) return fail("No temperature data available; cannot evaluate maturity")
  return fail(
    `Accumulated ${round1(ctx.gdd.total)} GDD has not reached the ${ctx.cropModel.gddToMaturity} GDD needed for maturity`,
  )
}

const contextComplete: Guard = (_season, ctx) => {
  if (!ctx.seasonArchiveComplete) {
    return fail("The season weather archive snapshot must exist before review")
  }
  if (!ctx.benchmarkResolved) return fail("The regional benchmark must be resolved before review")
  return ok
}

const rejected: Guard = (_season, ctx) =>
  ctx.notes.trim().length > 0
    ? ok
    : fail("A reason in notes is required to send a season back to growing")

interface NamedGuard {
  name: string
  check: Guard
}

const named = (name: string, check: Guard): NamedGuard => ({ name, check })

const GUARDS: Record<string, readonly NamedGuard[]> = {
  "planning->planted": [named("planned", planned)],
  "planted->growing": [named("emerged", emerged)],
  "growing->pre-harvest": [named("maturing", maturing)],
  "pre-harvest->harvested": [named("matured", matured)],
  "harvested->review": [named("contextComplete", contextComplete)],
  "pre-harvest->growing": [named("rejected", rejected)],
}

export type Evaluation =
  { ok: true } | { ok: false; kind: "invalid-transition" | "guard-failed"; reason: string }

/** Machine validity first, then every guard; returns the first failure. */
export function evaluate(season: SeasonState, to: Stage, ctx: TransitionContext): Evaluation {
  const check = checkTransition(season.stage, to)
  if (!check.valid) return { ok: false, kind: "invalid-transition", reason: check.reason }
  for (const guard of GUARDS[`${season.stage}->${to}`] ?? []) {
    const result = guard.check(season, ctx)
    if (!result.valid) return { ok: false, kind: "guard-failed", reason: result.reason }
  }
  return { ok: true }
}

export interface GuardReport {
  name: string
  result: GuardResult
}

export type FullEvaluation =
  { ok: false; kind: "invalid-transition"; reason: string } | { ok: true; guards: GuardReport[] }

/** Machine validity, then the state of every guard (not only the first failure). */
export function evaluateAll(
  season: SeasonState,
  to: Stage,
  ctx: TransitionContext,
): FullEvaluation {
  const check = checkTransition(season.stage, to)
  if (!check.valid) return { ok: false, kind: "invalid-transition", reason: check.reason }
  const guards = (GUARDS[`${season.stage}->${to}`] ?? []).map((g) => ({
    name: g.name,
    result: g.check(season, ctx),
  }))
  return { ok: true, guards }
}
