import { describe, expect, it } from "vitest"
import type { CropModel } from "./cropModel"
import { runScenario } from "./scenario"

const model: CropModel = {
  baseTempC: 10,
  capTempC: 30,
  gddToEmergence: 25,
  gddToMaturity: 60,
  source: "test",
}
// Ten days at 20/20: 10 GDD per day.
const time = Array.from({ length: 10 }, (_, i) => `2026-05-${String(i + 1).padStart(2, "0")}`)
const daily = { time, tempMax: time.map(() => 20), tempMin: time.map(() => 20) }
const window = { start: "2026-05-01", end: "2026-05-10" }
const base = { daily, window, model }

describe("runScenario", () => {
  it("matches the observed side when nothing changes", () => {
    const r = runScenario({ ...base, plantingShiftDays: 0, tempAdjustC: 0 })
    expect(r.scenario).toEqual(r.observed)
    expect(r.observed.gdd).toBe(100)
    expect(r.observed.state).toBe("thermal-maturity")
  })

  it("adds the temperature offset to every day", () => {
    const r = runScenario({ ...base, plantingShiftDays: 0, tempAdjustC: -5 })
    expect(r.scenario.gdd).toBe(50)
    expect(r.scenario.state).toBe("emerged")
    expect(r.observed.gdd).toBe(100)
  })

  it("drops days before a later planting date", () => {
    const r = runScenario({ ...base, plantingShiftDays: 7, tempAdjustC: 0 })
    expect(r.scenario.window.start).toBe("2026-05-08")
    expect(r.scenario.gdd).toBe(30)
    expect(r.scenario.maturityDate).toBeNull()
  })

  it("keeps null days missing rather than zero", () => {
    const gappy = { ...daily, tempMax: daily.tempMax.map((v, i) => (i < 5 ? null : v)) }
    const r = runScenario({ ...base, daily: gappy, plantingShiftDays: 0, tempAdjustC: 3 })
    expect(r.scenario.coverage).toBe(0.5)
  })
})
