import { describe, expect, it, vi } from "vitest"

import { ttlCache } from "./ttl"

describe("ttlCache", () => {
  it("reuses a result within the TTL and reloads after it", async () => {
    let t = 0
    const load = vi.fn(async (n: number) => n * 2)
    const cached = ttlCache(load, 1000, () => t)
    expect(await cached(2)).toBe(4)
    t = 999
    expect(await cached(2)).toBe(4)
    expect(load).toHaveBeenCalledTimes(1)
    t = 1000
    expect(await cached(2)).toBe(4)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it("keys entries by arguments", async () => {
    const load = vi.fn(async (a: number, b: number) => a + b)
    const cached = ttlCache(load, 1000)
    await cached(1, 2)
    await cached(2, 1)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it("shares one in-flight load between concurrent callers", async () => {
    const load = vi.fn(async () => "x")
    const cached = ttlCache(load, 1000)
    await Promise.all([cached(), cached()])
    expect(load).toHaveBeenCalledTimes(1)
  })

  it("does not cache a failure", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce("up")
    const cached = ttlCache(load as () => Promise<string>, 1000)
    await expect(cached()).rejects.toThrow("down")
    expect(await cached()).toBe("up")
    expect(load).toHaveBeenCalledTimes(2)
  })
})
