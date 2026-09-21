import { describe, expect, it } from "vitest"
import { haversineKm } from "./distance"

describe("haversineKm", () => {
  it("is zero for the same point", () => {
    expect(haversineKm({ lat: -33.45, lng: 18.75 }, { lat: -33.45, lng: 18.75 })).toBe(0)
  })

  it("matches a known distance (Cape Town to Johannesburg, about 1260 km)", () => {
    const d = haversineKm({ lat: -33.9249, lng: 18.4241 }, { lat: -26.2041, lng: 28.0473 })
    expect(d).toBeGreaterThan(1250)
    expect(d).toBeLessThan(1270)
  })

  it("is symmetric", () => {
    const a = { lat: -33.45, lng: 18.75 }
    const b = { lat: -34.1, lng: 19.2 }
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 9)
  })
})
