import { evaluateAll } from "@/lib/workflow/guards"
import { nextStage } from "@/lib/workflow/reconcile"
import type { SeasonState, TransitionContext } from "@/lib/workflow/types"
import type { ReadinessCheck } from "./types"

const pct = (n: number) => `${Math.round(n * 100)}%`

/**
 * Deterministic prerequisites for the season's next stage decision. Missing data is reported as
 * missing, never as a negative finding.
 */
export function readinessChecks(season: SeasonState, ctx: TransitionContext): ReadinessCheck[] {
  const checks: ReadinessCheck[] = []

  checks.push(
    ctx.cropModel
      ? {
          key: "crop-model",
          label: "Crop model resolved",
          status: "pass",
          detail: ctx.cropModel.source,
        }
      : {
          key: "crop-model",
          label: "Crop model resolved",
          status: "block",
          detail: "No crop model for this crop; GDD cannot be evaluated",
        },
  )

  checks.push(
    season.plantingDate
      ? {
          key: "planting-date",
          label: "Planting date set",
          status: "pass",
          detail: season.plantingDate,
        }
      : {
          key: "planting-date",
          label: "Planting date set",
          status: "block",
          detail: "plantingDate is not recorded",
        },
  )

  if (!ctx.gdd) {
    checks.push({
      key: "weather-coverage",
      label: "Weather coverage sufficient",
      status: "block",
      detail: "No temperature data has been fetched for this season",
    })
  } else if (ctx.gdd.coverage < ctx.minCoverage) {
    checks.push({
      key: "weather-coverage",
      label: "Weather coverage sufficient",
      status: "block",
      detail: `${pct(ctx.gdd.coverage)} of days have data; ${pct(ctx.minCoverage)} required`,
    })
  } else {
    checks.push({
      key: "weather-coverage",
      label: "Weather coverage sufficient",
      status: "pass",
      detail: `${pct(ctx.gdd.coverage)} of ${ctx.gdd.daysInWindow} days have data`,
    })
  }

  const next = nextStage(season.stage)
  if (next) {
    const evaluation = evaluateAll(season, next, ctx)
    if (evaluation.ok) {
      for (const g of evaluation.guards) {
        checks.push({
          key: `guard.${g.name}`,
          label: `Guard "${g.name}" for ${next}`,
          status: g.result.valid ? "pass" : "block",
          detail: g.result.valid ? "Satisfied" : g.result.reason,
        })
      }
    }
  }

  checks.push(
    ctx.benchmarkResolved
      ? {
          key: "benchmark",
          label: "Benchmark resolved",
          status: "pass",
          detail: "Regional benchmark recorded or marked unavailable",
        }
      : {
          key: "benchmark",
          label: "Benchmark resolved",
          status: next === "review" ? "block" : "warn",
          detail: "No regional benchmark resolved for this crop",
        },
  )

  return checks
}
