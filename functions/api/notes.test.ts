import { beforeEach, describe, expect, it, vi } from "vitest"

const fetch = vi.fn()
const commit = vi.fn()
const set = vi.fn()
const unset = vi.fn()
const append = vi.fn()
const setIfMissing = vi.fn()
const ifRevisionId = vi.fn()
const patch = vi.fn()
const txPatch = vi.fn()
const txCreate = vi.fn()
let counter: { _rev: string; writes: string[] } | null = null
let conflict = false
vi.mock("../_lib/sanity", () => ({
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
}))

import { request, run, sessionCookie, SITE } from "../_test/context"
import { onRequestPost } from "./notes"

// A fresh client address per request keeps the per-IP limiter out of these tests.
let client = 0
async function post(body: unknown, origin = SITE) {
  const cookie = await sessionCookie()
  const ip = `198.51.100.${++client % 250}`
  return run(
    onRequestPost,
    request("/api/notes", {
      method: "POST",
      body,
      headers: { cookie, origin, "cf-connecting-ip": ip },
    }),
  )
}

beforeEach(() => {
  conflict = false
  counter = null
  txPatch.mockReset()
  txCreate.mockReset()
  fetch.mockReset().mockResolvedValue({ keys: ["k1"] })
  commit.mockReset().mockResolvedValue({ transactionId: "rev2" })
  const chain = { set, unset, append, setIfMissing, commit }
  for (const fn of [set, unset, append, setIfMissing, ifRevisionId]) {
    fn.mockReset().mockReturnValue(chain)
  }
  patch.mockReset().mockReturnValue({ ifRevisionId })
})

describe("/api/notes", () => {
  it("rejects a cross-origin post", async () => {
    const res = await post(
      { action: "add", seasonId: "s", rev: "r", text: "x" },
      "https://evil.example",
    )
    expect(res.status).toBe(403)
  })
  it("adds a dated, signed note as Portable Text under the loaded revision", async () => {
    const res = await post({
      action: "add",
      seasonId: "season-a",
      rev: "rev1",
      text: "Hello **world**",
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ _rev: "rev2" })
    expect(ifRevisionId).toHaveBeenCalledWith("rev1")
    expect(setIfMissing).toHaveBeenCalledWith({ notes: [] })
    const [field, [note]] = append.mock.calls[0] as [
      string,
      {
        _type: string
        _key: string
        createdAt: string
        author: string
        body: { children: { marks: string[] }[] }[]
      }[],
    ]
    expect(field).toBe("notes")
    expect(note?._type).toBe("seasonNote")
    expect(note?._key).toMatch(/^[a-f0-9]{12}$/)
    expect(note?.author).toBeTruthy()
    expect(Date.parse(note?.createdAt ?? "")).not.toBeNaN()
    expect(note?.body[0]?.children[1]?.marks).toEqual(["strong"])
  })
  it("rejects a blank note", async () => {
    expect(
      (await post({ action: "add", seasonId: "season-a", rev: "rev1", text: "  " })).status,
    ).toBe(400)
  })
  it("edits only the chosen note", async () => {
    await post({ action: "edit", seasonId: "season-a", rev: "rev1", key: "k1", text: "New" })
    const [fields] = set.mock.calls[0] as [Record<string, unknown>]
    expect(Object.keys(fields).sort()).toEqual([
      'notes[_key=="k1"].body',
      'notes[_key=="k1"].updatedAt',
    ])
  })
  it("deletes only the chosen note", async () => {
    await post({ action: "delete", seasonId: "season-a", rev: "rev1", key: "k1" })
    expect(unset).toHaveBeenCalledWith(['notes[_key=="k1"]'])
  })
  it("returns 404 for an unknown note", async () => {
    expect(
      (await post({ action: "delete", seasonId: "season-a", rev: "rev1", key: "nope" })).status,
    ).toBe(404)
  })
  it("rejects a key that could break out of the patch path", async () => {
    const res = await post({ action: "delete", seasonId: "season-a", rev: "rev1", key: 'k1"]' })
    expect(res.status).toBe(400)
  })
  it("returns 404 for an unknown season", async () => {
    fetch.mockResolvedValue(null)
    expect((await post({ action: "add", seasonId: "nope", rev: "r", text: "x" })).status).toBe(404)
  })
  it("refuses a note past the per-season cap", async () => {
    fetch.mockResolvedValue({ keys: Array.from({ length: 100 }, (_, i) => `k${i}`) })
    expect((await post({ action: "add", seasonId: "season-a", rev: "r", text: "x" })).status).toBe(
      409,
    )
    expect(commit).not.toHaveBeenCalled()
  })
  it("returns 409 on a revision conflict", async () => {
    conflict = true
    commit.mockRejectedValue(new Error("conflict"))
    expect(
      (await post({ action: "add", seasonId: "season-a", rev: "old", text: "x" })).status,
    ).toBe(409)
  })
})

describe("/api/notes global hourly cap", () => {
  const add = { action: "add", seasonId: "season-a", rev: "rev1", text: "x" }
  it("creates the counter on the first write, in the same transaction", async () => {
    expect((await post(add)).status).toBe(200)
    const [doc] = txCreate.mock.calls[0] as [{ _id: string; writes: string[] }]
    expect(doc._id).toBe("rate-note-writes")
    expect(doc.writes).toHaveLength(1)
  })
  it("drops writes older than an hour and appends this one under the counter revision", async () => {
    const old = new Date(Date.now() - 2 * 3_600_000).toISOString()
    const recent = new Date(Date.now() - 60_000).toISOString()
    counter = { _rev: "c1", writes: [old, recent] }
    expect((await post(add)).status).toBe(200)
    expect(ifRevisionId).toHaveBeenCalledWith("c1")
    const [{ writes }] = set.mock.calls.at(-1) as [{ writes: string[] }]
    expect(writes).toHaveLength(2)
    expect(writes[0]).toBe(recent)
  })
  it("refuses any note change once 60 were made in the last hour", async () => {
    const now = new Date().toISOString()
    counter = { _rev: "c1", writes: Array<string>(60).fill(now) }
    for (const body of [add, { action: "delete", seasonId: "season-a", rev: "rev1", key: "k1" }]) {
      expect((await post(body)).status).toBe(429)
    }
    expect(commit).not.toHaveBeenCalled()
  })
})

describe("/api/notes counter contention", () => {
  it("retries when another note write moved the counter", async () => {
    conflict = true
    commit.mockRejectedValueOnce(new Error("counter moved"))
    const res = await post({ action: "add", seasonId: "season-a", rev: "rev1", text: "x" })
    expect(res.status).toBe(200)
    expect(commit).toHaveBeenCalledTimes(2)
  })
})
