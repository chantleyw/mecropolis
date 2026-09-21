import { describe, expect, it } from "vitest"
import { createRateLimiter } from "./rateLimit"

describe("createRateLimiter", () => {
  it("blocks after the limit within the window", () => {
    const allow = createRateLimiter(2, 1000)
    expect(allow("a", 0)).toBe(true)
    expect(allow("a", 10)).toBe(true)
    expect(allow("a", 20)).toBe(false)
  })
  it("recovers once hits leave the window", () => {
    const allow = createRateLimiter(1, 1000)
    expect(allow("a", 0)).toBe(true)
    expect(allow("a", 999)).toBe(false)
    expect(allow("a", 1000)).toBe(true)
  })
  it("tracks keys independently", () => {
    const allow = createRateLimiter(1, 1000)
    expect(allow("a", 0)).toBe(true)
    expect(allow("b", 0)).toBe(true)
  })
})

describe("createRateLimiter eviction", () => {
  it("drops expired keys during a sweep", () => {
    const allow = createRateLimiter(1, 1000)
    expect(allow("old", 0)).toBe(true)
    // Enough calls to trigger the sweep long after "old" expired.
    for (let i = 0; i < 100; i++) allow("busy", 10_000 + i * 2000)
    // "old" was evicted, so it is allowed again with an empty history.
    expect(allow("old", 500_000)).toBe(true)
  })
})
