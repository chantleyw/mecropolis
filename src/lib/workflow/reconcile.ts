import { crossingDate } from "@/lib/agronomy/gdd"
import { evaluate } from "./guards"
import type { SeasonState, Stage, TransitionContext } from "./types"

/** Forward path only; rejection (pre-harvest -> growing) is an override and is never proposed. */
const FORWARD: Partial<Record<Stage, Stage>> = {
  planning: "planted",
  planted: "growing",
  growing: "pre-harvest",
  "pre-harvest": "harvested",
  harvested: "review",
}

/** The next forward stage, or null at the end of the path. */
export const nextStage = (stage: Stage): Stage | null => FORWARD[stage] ?? null

export interface Hop {
  from: Stage
  to: Stage
  /** When the world changed (YYYY-MM-DD), not when the system noticed. */
  effectiveDate: string
  /** Evidence for the change, shown in the stage history. */
  basis: string
  gddTotal: number | null
  derivedFrom: "plantingDate" | "gdd-model" | "regional-benchmark"
}

export interface AdvancePlan {
  hops: Hop[]
  /** Why the season stopped, from the first failing guard; null when it reached review. */
  blockedBy: string | null
  derivedMaturityDate: string | null
}

const round1 = (n: number) => Math.round(n * 10) / 10

/** Walks the forward path one machine step at a time, stopping at the first guard that fails. */
export function planAdvances(season: SeasonState, ctx: TransitionContext): AdvancePlan {
  const today = ctx.now.toISOString().slice(0, 10)
  const model = ctx.cropModel
  const gdd = ctx.gdd

  const derivedMaturityDate =
    model && gdd
      ? (crossingDate(gdd, model.gddToMaturity) ?? season.derivedMaturityDate)
      : season.derivedMaturityDate

  const crossing = (threshold: number, label: string) => {
    if (!gdd) return null
    const date = crossingDate(gdd, threshold)
    const point = gdd.running.find((p) => p.date === date)
    return date && point
      ? {
          date,
          gddTotal: round1(point.cumulative),
          basis: `${round1(point.cumulative)} GDD reached the ${round1(threshold)} GDD ${label}`,
        }
      : null
  }

  const hops: Hop[] = []
  let state: SeasonState = { ...season, derivedMaturityDate }

  for (;;) {
    const to = FORWARD[state.stage]
    if (!to) return { hops, blockedBy: null, derivedMaturityDate }

    const result = evaluate(state, to, ctx)
    if (!result.ok) return { hops, blockedBy: result.reason, derivedMaturityDate }

    const hop = describeHop(state, to, today, crossing, model, ctx)
    if (hop.effectiveDate > today) {
      return {
        hops,
        blockedBy: `${hop.basis}; effective ${hop.effectiveDate} is in the future`,
        derivedMaturityDate,
      }
    }
    hops.push(hop)
    state = { ...state, stage: to }
  }
}

function describeHop(
  state: SeasonState,
  to: Stage,
  today: string,
  crossing: (
    threshold: number,
    label: string,
  ) => { date: string; gddTotal: number; basis: string } | null,
  model: TransitionContext["cropModel"],
  ctx: TransitionContext,
): Hop {
  const from = state.stage
  const gate = (threshold: number, label: string): Hop => {
    const c = crossing(threshold, label)
    // A guard already passed on the total, so the crossing exists whenever GDD is present.
    return {
      from,
      to,
      effectiveDate: c?.date ?? today,
      basis: c?.basis ?? `${label} (no crossing date)`,
      gddTotal: c?.gddTotal ?? null,
      derivedFrom: "gdd-model",
    }
  }

  switch (to) {
    case "planted":
      return {
        from,
        to,
        effectiveDate: state.plantingDate ?? today,
        basis: `plantingDate ${state.plantingDate ?? "unset"} (seeded configuration)`,
        gddTotal: null,
        derivedFrom: "plantingDate",
      }
    case "growing":
      return gate(model?.gddToEmergence ?? 0, "emergence threshold")
    case "pre-harvest":
      return gate((model?.gddToMaturity ?? 0) * ctx.preHarvestFraction, "pre-harvest threshold")
    case "harvested": {
      const c = crossing(model?.gddToMaturity ?? 0, "maturity threshold")
      return {
        from,
        to,
        effectiveDate: state.derivedMaturityDate ?? today,
        basis: c?.basis ?? "Maturity threshold reached",
        gddTotal: c?.gddTotal ?? null,
        derivedFrom: "gdd-model",
      }
    }
    default:
      return {
        from,
        to,
        effectiveDate: today,
        basis: "Season weather archive complete; regional benchmark resolved",
        gddTotal: null,
        derivedFrom: "regional-benchmark",
      }
  }
}

/** Fields the reconciler may set on a season. It never writes actualHarvest or yieldAmount. */
export function seasonPatch(plan: AdvancePlan, season: SeasonState): Record<string, unknown> {
  const last = plan.hops.at(-1)
  return {
    ...(last ? { stage: last.to } : {}),
    ...(plan.derivedMaturityDate && plan.derivedMaturityDate !== season.derivedMaturityDate
      ? { derivedMaturityDate: plan.derivedMaturityDate }
      : {}),
  }
}
