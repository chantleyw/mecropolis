import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const commit = vi.fn()
const set = vi.fn()
const unset = vi.fn()
const ifRevisionId = vi.fn()
const patch = vi.fn()
let conflict = false
vi.mock("../../_lib/sanity", () => ({
  writeClient: () => ({ patch }),
  isRevisionConflict: () => conflict,
  SANITY_API_VERSION: "2026-01-01",
}))

import { request, run, sessionCookie, SITE } from "../../_test/context"
import { onRequestPost } from "./restore"

const upstream = vi.fn()
const NOTES = [{ _type: "block", _key: "k1", children: [{ _type: "span", text: "Old" }] }]

function historyReturns(doc: Record<string, unknown> | null, status = 200) {
  upstream.mockResolvedValue(
    new Response(JSON.stringify({ documents: doc ? [doc] : [] }), { status }),
  )
}

async function post(body: unknown, { origin = SITE, signedIn = true } = {}) {
  const headers: Record<string, string> = { origin }
  if (signedIn) headers.cookie = await sessionCookie()
  return run(onRequestPost, request("/api/notes/restore", { method: "POST", body, headers }))
}

const BODY = { seasonId: "season-a", rev: "rev3", fromRev: "rev1" }

beforeEach(() => {
  conflict = false
  upstream.mockReset()
  vi.stubGlobal("fetch", upstream)
  historyReturns({ _id: "season-a", _type: "season", _rev: "rev1", notes: NOTES })
  commit.mockReset().mockResolvedValue({ _rev: "rev4" })
  const chain = { set, unset, commit }
  set.mockReset().mockReturnValue(chain)
  unset.mockReset().mockReturnValue(chain)
  ifRevisionId.mockReset().mockReturnValue(chain)
  patch.mockReset().mockReturnValue({ ifRevisionId })
})
afterEach(() => vi.unstubAllGlobals())

describe("/api/notes/restore", () => {
  it("requires a session", async () => {
    expect((await post(BODY, { signedIn: false })).status).toBe(401)
  })
  it("rejects a cross-origin post", async () => {
    expect((await post(BODY, { origin: "https://evil.example" })).status).toBe(403)
  })
  it("returns 404 for a revision the History API does not know", async () => {
    historyReturns(null, 404)
    expect((await post(BODY)).status).toBe(404)
    expect(patch).not.toHaveBeenCalled()
  })
  it("returns 404 when the revision belongs to another document", async () => {
    historyReturns({ _id: "farm-a", _type: "farm", _rev: "rev1" })
    expect((await post(BODY)).status).toBe(404)
  })
  it("returns 409 when the season changed since it was loaded", async () => {
    conflict = true
    commit.mockRejectedValue(new Error("conflict"))
    expect((await post(BODY)).status).toBe(409)
  })
  it("writes the notes from the earlier revision under the loaded revision", async () => {
    const res = await post(BODY)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ _rev: "rev4" })
    expect(upstream.mock.calls[0]?.[0]).toContain("/documents/season-a?revision=rev1")
    expect(ifRevisionId).toHaveBeenCalledWith("rev3")
    expect(set).toHaveBeenCalledWith({ notes: NOTES })
  })
  it("unsets the notes when the earlier revision had none", async () => {
    historyReturns({ _id: "season-a", _type: "season", _rev: "rev1" })
    await post(BODY)
    expect(unset).toHaveBeenCalledWith(["notes"])
  })
})
