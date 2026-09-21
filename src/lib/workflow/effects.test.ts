import { describe, expect, it } from "vitest"
import { expectedHarvestDate, seasonWindow } from "./effects"

describe("seasonWindow", () => {
  it("runs from planting to today", () => {
    expect(seasonWindow("2026-06-01", 150, "2026-09-21")).toEqual({
      start: "2026-06-01",
      end: "2026-09-21",
    })
  })
  it("bounds the end at twice the crop cycle", () => {
    expect(seasonWindow("2026-01-01", 30, "2026-09-21")).toEqual({
      start: "2026-01-01",
      end: "2026-03-02",
    })
  })
  it("is null before planting", () => {
    expect(seasonWindow("2026-10-01", 150, "2026-09-21")).toBeNull()
  })
  it("includes a same-day planting", () => {
    expect(seasonWindow("2026-09-21", 150, "2026-09-21")).toEqual({
      start: "2026-09-21",
      end: "2026-09-21",
    })
  })
})

describe("expectedHarvestDate", () => {
  it("adds the growth cycle to plantingDate", () => {
    expect(expectedHarvestDate("2026-06-01", 150)).toBe("2026-10-29")
  })
  it("crosses year boundaries in UTC", () => {
    expect(expectedHarvestDate("2026-12-20", 20)).toBe("2027-01-09")
  })
})
