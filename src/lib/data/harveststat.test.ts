import { describe, expect, it } from "vitest"
import { harvestStatMeta, provinceYield } from "./harveststat"

describe("provinceYield", () => {
  it("returns Western Cape wheat 2025 in kg/ha", () => {
    expect(provinceYield("Western Cape", "Wheat", 2025, 2025)).toEqual([
      { year: 2025, kgPerHa: 2900 },
    ])
  })

  it("bounds the range and sorts by year", () => {
    const rows = provinceYield("Western Cape", "Canola Seed", 2020, 2025)
    expect(rows.map((r) => r.year)).toEqual([2020, 2021, 2022, 2023, 2024, 2025])
  })

  it("returns nothing for an unknown product", () => {
    expect(provinceYield("Western Cape", "Narrow-leafed lupin", 1979, 2025)).toEqual([])
  })

  it("carries licence and retrieval date", () => {
    expect(harvestStatMeta.licence).toBe("MIT")
    expect(harvestStatMeta.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
