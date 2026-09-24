import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const fetch = vi.fn()
const commit = vi.fn()
const append = vi.fn()
const setIfMissing = vi.fn()
const set = vi.fn()
const unset = vi.fn()
const ifRevisionId = vi.fn()
const patch = vi.fn()
const txPatch = vi.fn()
const txCreate = vi.fn()
let counter: { _rev: string; writes: string[] } | null = null
let conflict = false
vi.mock("../../_lib/sanity", () => ({
  writeClient: () => ({
    fetch: (query: string, params: { id: string }) =>
      params.id === "rate-note-writes" ? Promise.resolve(counter) : fetch(query, params),
    patch,
    transaction: () => {
      const tx = { patch: txPatch, create: txCreate, commit }
      txPatch.mockReturnValue(tx)
      txCreate.mockReturnValue(tx)
      return tx
    },
  }),
  isRevisionConflict: () => conflict,
  SANITY_API_VERSION: "2026-01-01",
}))

import { request, run, sessionCookie, SITE } from "../../_test/context"
import { onRequestPost } from "./restore"

const upstream = vi.fn()
const NOTE = {
  _type: "seasonNote",
  _key: "k1",
  createdAt: "2026-09-20T08:00:00Z",
  author: "demo",
  body: [
    { _type: "block", _key: "b1", children: [{ _type: "span", text: "Old text", marks: [] }] },
  ],
}

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

const BODY = { seasonId: "season-a", rev: "rev3", fromRev: "rev1", key: "k1" }

beforeEach(() => {
  conflict = false
  counter = null
  txPatch.mockReset()
  txCreate.mockReset()
  upstream.mockReset()
  vi.stubGlobal("fetch", upstream)
  historyReturns({ _id: "season-a", _type: "season", _rev: "rev1", notes: [NOTE] })
  fetch.mockReset().mockResolvedValue({ keys: ["k1", "k2"] })
  commit.mockReset().mockResolvedValue({ transactionId: "rev4" })
  const chain = { set, unset, append, setIfMissing, commit }
  for (const fn of [set, unset, append, setIfMissing, ifRevisionId]) {
    fn.mockReset().mockReturnValue(chain)
  }
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
  it("returns 404 when that revision lacks the note", async () => {
    historyReturns({ _id: "season-a", _type: "season", _rev: "rev1", notes: [] })
    expect((await post(BODY)).status).toBe(404)
  })
  it("puts back only the chosen note, as it read at that revision", async () => {
    const res = await post(BODY)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ _rev: "rev4" })
    expect(upstream.mock.calls[0]?.[0]).toContain("/documents/season-a?revision=rev1")
    expect(ifRevisionId).toHaveBeenCalledWith("rev3")
    const [fields] = set.mock.calls[0] as [
      Record<string, { createdAt: string; body: { children: { text: string }[] }[] }>,
    ]
    const restored = fields['notes[_key=="k1"]']
    expect(Object.keys(fields)).toEqual(['notes[_key=="k1"]'])
    expect(restored?.createdAt).toBe(NOTE.createdAt)
    expect(restored?.body[0]?.children[0]?.text).toBe("Old text")
  })
  it("re-adds a note that has since been deleted", async () => {
    fetch.mockResolvedValue({ keys: ["k2"] })
    await post(BODY)
    expect(set).not.toHaveBeenCalled()
    const [, [note]] = append.mock.calls[0] as [string, { _key: string }[]]
    expect(note?._key).toBe("k1")
  })
})
