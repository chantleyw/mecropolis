import { beforeEach, describe, expect, it, vi } from "vitest"

const fetch = vi.fn()
const action = vi.fn()
vi.mock("../../_lib/sanity", () => ({ writeClient: () => ({ fetch, action }) }))

import { request, run, sessionCookie, SITE } from "../../_test/context"
import { onRequestGet, onRequestPost } from "./index"

const body = { seasonId: "season-1", type: "monitor", rationale: "Check canopy after the heat" }

async function post() {
  const cookie = await sessionCookie()
  return run(
    onRequestPost,
    request("/api/recommendations", { method: "POST", body, headers: { cookie, origin: SITE } }),
  )
}

async function get(farm: string) {
  const cookie = await sessionCookie()
  return run(onRequestGet, request(`/api/recommendations?farm=${farm}`, { headers: { cookie } }))
}

beforeEach(() => {
  fetch.mockReset()
  action.mockReset().mockResolvedValue({ transactionId: "tx-1" })
})

describe("POST /api/recommendations", () => {
  it("creates a proposed draft through the Actions API under the hourly cap", async () => {
    fetch.mockResolvedValue({ fieldId: "field-1", recent: 0 })
    const res = await post()
    expect(res.status).toBe(201)
    const { id } = (await res.json()) as { id: string }
    expect(action).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "sanity.action.document.create",
        publishedId: id,
        ifExists: "fail",
        attributes: expect.objectContaining({
          _id: `drafts.${id}`,
          status: "proposed",
          createdBy: "demo",
        }),
      }),
    )
    // The cap counts drafts.
    expect(fetch.mock.calls[0]?.[2]).toEqual({ perspective: "raw" })
  })
  it("returns 429 once the hourly cap is reached", async () => {
    fetch.mockResolvedValue({ fieldId: "field-1", recent: 60 })
    expect((await post()).status).toBe(429)
    expect(action).not.toHaveBeenCalled()
  })
  it("returns 404 for an unknown season", async () => {
    fetch.mockResolvedValue({ fieldId: null, recent: 0 })
    expect((await post()).status).toBe(404)
    expect(action).not.toHaveBeenCalled()
  })
})

describe("GET /api/recommendations", () => {
  it("reads proposed drafts for a farm", async () => {
    fetch.mockResolvedValue([{ _id: "rec-1" }])
    const res = await get("hoek-farm")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ entries: [{ _id: "rec-1" }] })
    expect(fetch.mock.calls[0]?.[1]).toEqual({ slug: "hoek-farm" })
    expect(fetch.mock.calls[0]?.[2]).toEqual({ perspective: "drafts" })
  })
  it("rejects a bad farm slug", async () => {
    expect((await get("..%2Fx")).status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })
  it("requires a session", async () => {
    const res = await run(onRequestGet, request("/api/recommendations?farm=hoek-farm"))
    expect(res.status).toBe(401)
    expect(fetch).not.toHaveBeenCalled()
  })
})
