import { describe, expect, it } from "vitest"
import { buildAlerts, type AlertSeason } from "@/lib/dashboard/alerts"

const base: AlertSeason = {
  id: "s1",
  label: "Wheat 2026",
  fieldName: "North",
  stage: "growing",
  plantingDate: "2026-06-01",
  pestCount: 0,
  result: { status: "error" },
}
const ok = (pct: number): AlertSeason["result"] => ({
  status: "ok",
  progress: { total: pct * 22, maturity: 2200, pct, daysWithData: 1, daysInWindow: 1, running: [] },
})

describe("buildAlerts", () => {
  it("flags a season still at planning after its planting date", () => {
    const a = buildAlerts([{ ...base, stage: "planning", result: ok(0) }], null, "2026-07-01")
    expect(a.map((x) => x.key)).toEqual(["overdue-s1"])
  })

  it("does not flag planning before the planting date", () => {
    const a = buildAlerts([{ ...base, stage: "planning", result: ok(0) }], null, "2026-05-01")
    expect(a).toEqual([])
  })

  it("reports missing and failed progress with the reason", () => {
    const a = buildAlerts(
      [
        { ...base, id: "a", result: { status: "missing", reason: "No GDD model" } },
        { ...base, id: "b", result: { status: "error" } },
      ],
      null,
      "2026-07-01",
    )
    expect(a.find((x) => x.key === "missing-a")?.evidence).toBe("No GDD model")
    expect(a.find((x) => x.key === "error-b")?.tone).toBe("warn")
  })

  it("flags maturity reached while the stage is behind", () => {
    const a = buildAlerts([{ ...base, result: ok(100) }], null, "2026-07-01")
    expect(a[0]?.key).toBe("mature-s1")
  })

  it("flags stored pest sightings", () => {
    const a = buildAlerts([{ ...base, result: ok(50), pestCount: 3 }], null, "2026-07-01")
    expect(a[0]?.evidence).toContain("3 regional GBIF records")
  })

  it("flags frost and heat in the forecast and sorts warnings first", () => {
    const a = buildAlerts(
      [{ ...base, result: ok(50), pestCount: 1 }],
      [
        { date: "2026-07-02", min: -1, max: 10 },
        { date: "2026-07-03", min: 5, max: 34 },
      ],
      "2026-07-01",
    )
    expect(a.map((x) => x.key)).toEqual(["forecast-frost", "forecast-heat", "pests-s1"])
  })
})
