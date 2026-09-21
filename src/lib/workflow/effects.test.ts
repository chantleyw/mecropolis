import { describe, expect, it } from "vitest"
import { expectedHarvestDate, weatherPlanFor } from "./effects"

const base = { plantingDate: "2026-06-01", actualHarvest: "2026-11-10", today: "2026-09-21" }

describe("weatherPlanFor", () => {
  it("uses a 14-day forecast for planted and growing", () => {
    expect(weatherPlanFor("planning", "planted", base)).toEqual({
      kind: "forecast",
      forecastDays: 14,
    })
    expect(weatherPlanFor("planted", "growing", base)).toEqual({
      kind: "forecast",
      forecastDays: 14,
    })
  })
  it("uses the archive from planting to today for pre-harvest", () => {
    expect(weatherPlanFor("growing", "pre-harvest", base)).toEqual({
      kind: "archive",
      start: "2026-06-01",
      end: "2026-09-21",
    })
  })
  it("caps the harvested range at today", () => {
    expect(weatherPlanFor("pre-harvest", "harvested", base)).toEqual({
      kind: "archive",
      start: "2026-06-01",
      end: "2026-09-21",
    })
    expect(
      weatherPlanFor("pre-harvest", "harvested", { ...base, actualHarvest: "2026-08-30" }),
    ).toMatchObject({ end: "2026-08-30" })
  })
  it("has no effect for other transitions", () => {
    expect(weatherPlanFor("harvested", "review", base)).toBeNull()
  })
})

describe("expectedHarvestDate", () => {
  it("adds the growth cycle to the planting date", () => {
    expect(expectedHarvestDate("2026-06-15", 150)).toBe("2026-11-12")
  })
})
