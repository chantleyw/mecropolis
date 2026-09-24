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
  ownerId: "demo",
  body: [
    { _type: "block", _key: "b1", children: [{ _type: "span", text: "Old text", marks: [] }] },
  ],
}

function historyReturns(doc: Record<string, unknown> | null, status = 200) {
  upstream.mockImplementation(() =>
    Promise.resolve(new Response(JSON.stringify({ documents: doc ? [doc] : [] }), { status })),
  )
}

// A fresh client address per request keeps the per-IP limiter out of these tests.
let client = 0
async function post(body: unknown, { origin = SITE, signedIn = true, user = "demo" } = {}) {
  const headers: Record<string, string> = {
    origin,
    "cf-connecting-ip": `198.51.100.${++client % 250}`,
  }
  if (signedIn) headers.cookie = await sessionCookie(user)
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
  fetch.mockReset().mockResolvedValue({
    notes: [
      { _key: "k1", ownerId: "demo" },
      { _key: "k2", ownerId: "demo" },
    ],
  })
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
  it("refuses to restore another account's note", async () => {
    expect((await post(BODY, { user: "someone-else" })).status).toBe(403)
    fetch.mockResolvedValue({ notes: [] })
    expect((await post(BODY, { user: "someone-else" })).status).toBe(403)
    expect(commit).not.toHaveBeenCalled()
  })
  it("judges an existing note by its current owner, not the old copy", async () => {
    fetch.mockResolvedValue({ notes: [{ _key: "k1", ownerId: "someone-else" }] })
    expect((await post(BODY)).status).toBe(403)
  })
  it("restores a copy from before owners onto the owner's note, keeping the owner", async () => {
    const unowned = { ...NOTE, ownerId: undefined }
    historyReturns({ _id: "season-a", _type: "season", _rev: "rev1", notes: [unowned] })
    expect((await post(BODY)).status).toBe(200)
    const [fields] = set.mock.calls[0] as [Record<string, { ownerId: string }>]
    expect(fields['notes[_key=="k1"]']?.ownerId).toBe("demo")
  })
  it("refuses to re-add a deleted note that has no owner", async () => {
    const unowned = { ...NOTE, ownerId: undefined }
    historyReturns({ _id: "season-a", _type: "season", _rev: "rev1", notes: [unowned] })
    fetch.mockResolvedValue({ notes: [] })
    expect((await post(BODY)).status).toBe(403)
  })
  it("re-adds a note that has since been deleted", async () => {
    fetch.mockResolvedValue({ notes: [{ _key: "k2", ownerId: "demo" }] })
    expect((await post(BODY)).status).toBe(200)
    expect(set).not.toHaveBeenCalled()
    const [, [note]] = append.mock.calls[0] as [string, { _key: string }[]]
    expect(note?._key).toBe("k1")
  })
})
