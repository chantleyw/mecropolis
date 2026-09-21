import { describe, expect, it } from "vitest"
import { cropModelFor } from "@/lib/agronomy/cropModel"
import type { SeasonState, TransitionContext } from "@/lib/workflow/types"
import { readinessChecks } from "./checks"
import { summarizeReadiness } from "./explain"

const model = cropModelFor("wheat")

const season = (over: Partial<SeasonState> = {}): SeasonState => ({
  stage: "growing",
  cropId: "c1",
  plantingDate: "2026-06-01",
  actualHarvest: null,
  yieldAmount: null,
  derivedMaturityDate: null,
  ...over,
})

const ctx = (over: Partial<TransitionContext> = {}): TransitionContext => ({
  now: new Date("2026-09-01T00:00:00Z"),
  notes: "",
  cropModel: model,
  gdd: { total: 500, daysWithData: 10, daysInWindow: 10, coverage: 1, running: [] },
  minCoverage: 0.9,
  preHarvestFraction: 0.9,
  seasonArchiveComplete: false,
  benchmarkResolved: true,
  ...over,
})

const byKey = (checks: ReturnType<typeof readinessChecks>, key: string) =>
  checks.find((c) => c.key === key)

describe("readinessChecks", () => {
  it("blocks on the next guard with its reason", () => {
    const c = byKey(readinessChecks(season(), ctx()), "guard.maturing")
    expect(c?.status).toBe("block")
    expect(c?.detail).toContain("below")
  })
  it("reports missing weather as blocked, not as a low value", () => {
    const c = byKey(readinessChecks(season(), ctx({ gdd: null })), "weather-coverage")
    expect(c).toMatchObject({ status: "block", detail: expect.stringContaining("No temperature") })
  })
  it("blocks on coverage below the minimum", () => {
    const low = { total: 10, daysWithData: 5, daysInWindow: 10, coverage: 0.5, running: [] }
    expect(byKey(readinessChecks(season(), ctx({ gdd: low })), "weather-coverage")?.status).toBe(
      "block",
    )
  })
  it("blocks when there is no crop model", () => {
    expect(byKey(readinessChecks(season(), ctx({ cropModel: null })), "crop-model")?.status).toBe(
      "block",
    )
  })
  it("warns on a missing benchmark before review, blocks at harvested", () => {
    const c = ctx({ benchmarkResolved: false })
    expect(byKey(readinessChecks(season(), c), "benchmark")?.status).toBe("warn")
    expect(byKey(readinessChecks(season({ stage: "harvested" }), c), "benchmark")?.status).toBe(
      "block",
    )
  })
  it("has no guard checks at the end of the path", () => {
    const keys = readinessChecks(season({ stage: "review" }), ctx()).map((c) => c.key)
    expect(keys.some((k) => k.startsWith("guard."))).toBe(false)
  })
})

describe("summarizeReadiness", () => {
  it("counts passing checks and separates blockers from warnings", () => {
    const s = summarizeReadiness(readinessChecks(season(), ctx({ benchmarkResolved: false })))
    expect(s.percent).toBe(Math.round((s.passed / s.total) * 100))
    expect(s.blockers.map((b) => b.key)).toEqual(["guard.maturing"])
    expect(s.warnings.map((w) => w.key)).toEqual(["benchmark"])
  })
  it("is 0 for an empty checklist", () => {
    expect(summarizeReadiness([]).percent).toBe(0)
  })
})
