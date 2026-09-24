import { beforeEach, describe, expect, it, vi } from "vitest"

const fetch = vi.fn()
const commit = vi.fn()
const set = vi.fn()
const unset = vi.fn()
const append = vi.fn()
const setIfMissing = vi.fn()
const ifRevisionId = vi.fn()
const patch = vi.fn()
let conflict = false
vi.mock("../_lib/sanity", () => ({
  writeClient: () => ({ fetch, patch }),
  isRevisionConflict: () => conflict,
}))

import { request, run, sessionCookie, SITE } from "../_test/context"
import { onRequestPost } from "./notes"

async function post(body: unknown, origin = SITE) {
  const cookie = await sessionCookie()
  return run(
    onRequestPost,
    request("/api/notes", { method: "POST", body, headers: { cookie, origin } }),
  )
}

beforeEach(() => {
  conflict = false
  fetch.mockReset().mockResolvedValue({ keys: ["k1"] })
  commit.mockReset().mockResolvedValue({ _rev: "rev2" })
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
