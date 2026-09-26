import { describe, expect, it, vi } from "vitest"

const fetch = vi.fn()
vi.mock("../_lib/sanity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../_lib/sanity")>()),
  readClient: () => ({ fetch }),
}))

import { request, run, sessionCookie } from "../_test/context"
import { onRequestGet } from "./weather"

async function get(query: string, ip: string) {
  const cookie = await sessionCookie()
  return run(
    onRequestGet,
    request(`/api/weather?${query}`, { headers: { cookie, "cf-connecting-ip": ip } }),
  )
}

describe("/api/weather", () => {
  it("rejects a range longer than a season before any fetch", async () => {
    const res = await get("fieldId=field-a&start=1940-01-01&end=2025-12-31", "203.0.113.40")
    expect(res.status).toBe(400)
    const year = await get("fieldId=field-a&start=2024-01-01&end=2025-01-01", "203.0.113.41")
    expect(year.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it("accepts a range of up to a season", async () => {
    fetch.mockResolvedValueOnce(null)
    const res = await get("fieldId=field-a&start=2025-01-01&end=2025-12-31", "203.0.113.42")
    expect(res.status).toBe(404)
    expect(fetch).toHaveBeenCalledOnce()
  })
})
