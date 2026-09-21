import { describe, expect, it } from "vitest"
import { classifyTexture, toFieldSoilType } from "./soilgrids"

describe("classifyTexture", () => {
  it.each([
    [92, 5, 3, "sand"],
    [82.7, 6.6, 10.7, "loamy sand"],
    [65, 20, 15, "sandy loam"],
    [40, 40, 20, "loam"],
    [20, 65, 15, "silt loam"],
    [8, 88, 4, "silt"],
    [60, 10, 30, "sandy clay loam"],
    [35, 30, 35, "clay loam"],
    [10, 55, 35, "silty clay loam"],
    [50, 5, 45, "sandy clay"],
    [5, 50, 45, "silty clay"],
    [20, 20, 60, "clay"],
  ] as const)("sand %d silt %d clay %d is %s", (sand, silt, clay, expected) => {
    expect(classifyTexture(sand, silt, clay)).toBe(expected)
  })
})

describe("toFieldSoilType", () => {
  it("maps onto the Studio list", () => {
    expect(toFieldSoilType("loamy sand")).toBe("sandy")
    expect(toFieldSoilType("silt loam")).toBe("silty")
    expect(toFieldSoilType("clay loam")).toBe("loamy")
    expect(toFieldSoilType("clay")).toBe("clay")
  })
})
