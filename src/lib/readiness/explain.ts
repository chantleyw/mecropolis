import type { ReadinessCheck, ReadinessSummary } from "./types"

/** Percent is the share of checks with status "pass"; a warning counts as not passed. */
export function summarizeReadiness(checks: ReadinessCheck[]): ReadinessSummary {
  const passed = checks.filter((c) => c.status === "pass").length
  const total = checks.length
  return {
    passed,
    total,
    percent: total === 0 ? 0 : Math.round((passed / total) * 100),
    blockers: checks.filter((c) => c.status === "block"),
    warnings: checks.filter((c) => c.status === "warn"),
  }
}
