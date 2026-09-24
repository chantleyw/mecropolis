import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const query = vi.fn()
vi.mock("../_lib/sanity", () => ({
  readClient: () => ({ fetch: query }),
  SANITY_API_VERSION: "2026-01-01",
}))

import { request, run, sessionCookie } from "../_test/context"
import { onRequestGet } from "./history"

const upstream = vi.fn()

async function get(id: string) {
  const cookie = await sessionCookie()
  return run(onRequestGet, request(`/api/history?id=${id}`, { headers: { cookie } }))
}

beforeEach(() => {
  query.mockReset().mockResolvedValue("season")
  upstream.mockReset()
  vi.stubGlobal("fetch", upstream)
})
afterEach(() => vi.unstubAllGlobals())

describe("/api/history", () => {
  it("requires a session", async () => {
    const res = await run(onRequestGet, request("/api/history?id=season-a"))
    expect(res.status).toBe(401)
  })
  it("rejects a dotted id", async () => {
    expect((await get("drafts.season-a")).status).toBe(400)
  })
  it("returns 404 for a type without a timeline", async () => {
    query.mockResolvedValue("farm")
    expect((await get("farm-a")).status).toBe(404)
    expect(upstream).not.toHaveBeenCalled()
  })
  it("returns each revision with the stage at that revision", async () => {
    const lines = [
      { id: "rev2", timestamp: "2026-09-24T08:00:00Z", mutations: [{ patch: { id: "season-a" } }] },
      {
        id: "rev1",
        timestamp: "2026-09-23T08:00:00Z",
        mutations: [{ create: { _id: "season-a" } }],
      },
    ]
    upstream.mockImplementation((url: string) => {
      const body = url.includes("/transactions/")
        ? lines.map((l) => JSON.stringify(l)).join("\n")
        : JSON.stringify({ documents: [{ stage: url.includes("rev2") ? "growing" : "planning" }] })
      return Promise.resolve(new Response(body))
    })
    const res = await get("season-a")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      entries: [
        { rev: "rev2", timestamp: "2026-09-24T08:00:00Z", action: "updated", state: "growing" },
        { rev: "rev1", timestamp: "2026-09-23T08:00:00Z", action: "created", state: "planning" },
      ],
    })
    const [url, init] = upstream.mock.calls[0] as [string, RequestInit]
    expect(url).toContain("excludeContent=true")
    expect(init.headers).toEqual({ authorization: "Bearer token" })
  })
  it("reports an upstream failure as 502", async () => {
    upstream.mockResolvedValue(new Response("no", { status: 500 }))
    expect((await get("season-a")).status).toBe(502)
  })
})
