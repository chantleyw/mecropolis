import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"
import { fetchJson } from "./fetchJson"

afterEach(() => vi.unstubAllGlobals())

const schema = z.object({ ok: z.boolean() })
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

describe("fetchJson", () => {
  it("retries once on 5xx then succeeds", async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json({ ok: true }))
    vi.stubGlobal("fetch", fn)
    await expect(fetchJson("https://x", schema)).resolves.toEqual({ ok: true })
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it("gives up after the retry", async () => {
    const fn = vi.fn().mockImplementation(() => Promise.resolve(json({}, 500)))
    vi.stubGlobal("fetch", fn)
    await expect(fetchJson("https://x", schema)).rejects.toThrow(/500/)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it("does not retry a 4xx", async () => {
    const fn = vi.fn().mockImplementation(() => Promise.resolve(json({}, 404)))
    vi.stubGlobal("fetch", fn)
    await expect(fetchJson("https://x", schema)).rejects.toThrow(/404/)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("rejects a body that fails the schema", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ ok: "yes" })))
    await expect(fetchJson("https://x", schema)).rejects.toThrow(/Unexpected response shape/)
  })
})
