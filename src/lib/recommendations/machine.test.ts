import { describe, expect, it } from "vitest"
import { STATUSES, checkTransition, type RecommendationStatus } from "./machine"

const allowed: [RecommendationStatus, RecommendationStatus][] = [
  ["proposed", "approved"],
  ["proposed", "rejected"],
  ["proposed", "expired"],
  ["approved", "completed"],
  ["approved", "expired"],
]

describe("recommendation machine", () => {
  it("allows exactly the listed transitions", () => {
    for (const from of STATUSES) {
      for (const to of STATUSES) {
        const expected = allowed.some(([f, t]) => f === from && t === to)
        expect(checkTransition(from, to).valid).toBe(expected)
      }
    }
  })

  it("names valid targets in the rejection reason", () => {
    expect(checkTransition("proposed", "completed")).toEqual({
      valid: false,
      reason:
        "Cannot change a proposed recommendation to completed. Valid targets: approved, rejected, expired",
    })
  })

  it("reports final statuses", () => {
    const check = checkTransition("rejected", "approved")
    expect(check.valid).toBe(false)
    if (!check.valid) expect(check.reason).toContain("none (final status)")
  })
})
