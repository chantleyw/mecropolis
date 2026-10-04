import { evaluateAll } from "@/lib/workflow/guards"
import { nextStage } from "@/lib/workflow/reconcile"
import type { SeasonState, TransitionContext } from "@/lib/workflow/types"
import { t } from "@/lib/i18n/store"
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
          label: t("season.readiness.check.cropModel"),
          status: "pass",
          detail: ctx.cropModel.source,
        }
      : {
          key: "crop-model",
          label: t("season.readiness.check.cropModel"),
          status: "block",
          detail: t("season.readiness.check.cropModel.none"),
        },
  )

  checks.push(
    season.plantingDate
      ? {
          key: "planting-date",
          label: t("season.readiness.check.planting"),
          status: "pass",
          detail: season.plantingDate,
        }
      : {
          key: "planting-date",
          label: t("season.readiness.check.planting"),
          status: "block",
          detail: t("season.readiness.check.planting.none"),
        },
  )

  if (!ctx.gdd) {
    checks.push({
      key: "weather-coverage",
      label: t("season.readiness.check.coverage"),
      status: "block",
      detail: t("season.readiness.check.coverage.none"),
    })
  } else if (ctx.gdd.coverage < ctx.minCoverage) {
    checks.push({
      key: "weather-coverage",
      label: t("season.readiness.check.coverage"),
      status: "block",
      detail: t("season.readiness.check.coverage.low", {
        have: pct(ctx.gdd.coverage),
        need: pct(ctx.minCoverage),
      }),
    })
  } else {
    checks.push({
      key: "weather-coverage",
      label: t("season.readiness.check.coverage"),
      status: "pass",
      detail: t("season.readiness.check.coverage.ok", {
        have: pct(ctx.gdd.coverage),
        days: ctx.gdd.daysInWindow,
      }),
    })
  }

  const next = nextStage(season.stage)
  if (next) {
    const evaluation = evaluateAll(season, next, ctx)
    if (evaluation.ok) {
      for (const g of evaluation.guards) {
        checks.push({
          key: `guard.${g.name}`,
          label: t("season.readiness.check.guard", {
            name: g.name,
            next: t(`stage.${next}` as const),
          }),
          status: g.result.valid ? "pass" : "block",
          detail: g.result.valid ? t("season.readiness.check.guard.ok") : g.result.reason,
        })
      }
    }
  }

  checks.push(
    ctx.benchmarkResolved
      ? {
          key: "benchmark",
          label: t("season.readiness.check.benchmark"),
          status: "pass",
          detail: t("season.readiness.check.benchmark.ok"),
        }
      : {
          key: "benchmark",
          label: t("season.readiness.check.benchmark"),
          status: next === "review" ? "block" : "warn",
          detail: t("season.readiness.check.benchmark.none"),
        },
  )

  return checks
}
