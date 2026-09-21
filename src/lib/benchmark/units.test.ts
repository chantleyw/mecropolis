import { describe, expect, it } from "vitest"
import { toKgPerHa } from "./units"

describe("toKgPerHa", () => {
  it("converts mt/ha", () => expect(toKgPerHa(2.9, "mt/ha")).toBe(2900))
  it("passes kg/ha through", () => expect(toKgPerHa(4651.9, "kg/ha")).toBe(4651.9))
  it("throws on an unknown unit", () => {
    expect(() => toKgPerHa(1, "bu/ac")).toThrow("Unknown yield unit: bu/ac")
  })
})
