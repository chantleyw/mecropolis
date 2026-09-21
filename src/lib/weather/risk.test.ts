import { describe, expect, it } from "vitest"
import { assessRisk, RISK_MARKER } from "./risk"

describe("assessRisk", () => {
  it("flags humidity above 80", () => {
    const r = assessRisk({ maxHumidity: 92, maxTemp: 25 })
    expect(r.elevated).toBe(true)
    expect(r.text).toContain(RISK_MARKER)
    expect(r.text).toContain("92%")
  })
  it("flags temperature above 30", () => {
    expect(assessRisk({ maxHumidity: 50, maxTemp: 33 }).elevated).toBe(true)
  })
  it("does not flag the limits themselves", () => {
    expect(assessRisk({ maxHumidity: 80, maxTemp: 30 }).elevated).toBe(false)
  })
})
