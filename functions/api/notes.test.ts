import { beforeEach, describe, expect, it, vi } from "vitest"

const fetch = vi.fn()
const commit = vi.fn()
const set = vi.fn()
const unset = vi.fn()
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
  fetch.mockReset().mockResolvedValue(true)
  commit.mockReset().mockResolvedValue({ _rev: "rev2" })
  const chain = { set, unset, commit }
  set.mockReset().mockReturnValue(chain)
  unset.mockReset().mockReturnValue(chain)
  ifRevisionId.mockReset().mockReturnValue(chain)
  patch.mockReset().mockReturnValue({ ifRevisionId })
})

describe("/api/notes", () => {
  it("rejects a cross-origin post", async () => {
    expect(
      (await post({ seasonId: "s", rev: "r", text: "x" }, "https://evil.example")).status,
    ).toBe(403)
  })
  it("stores text as Portable Text under the loaded revision", async () => {
    const res = await post({ seasonId: "season-a", rev: "rev1", text: "Hello **world**" })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ _rev: "rev2" })
    expect(ifRevisionId).toHaveBeenCalledWith("rev1")
    const [{ notes }] = set.mock.calls[0] as [
      { notes: { _type: string; children: { marks: string[] }[] }[] },
    ]
    expect(notes[0]?._type).toBe("block")
    expect(notes[0]?.children[1]?.marks).toEqual(["strong"])
  })
  it("unsets notes when the text is blank", async () => {
    await post({ seasonId: "season-a", rev: "rev1", text: "  " })
    expect(unset).toHaveBeenCalledWith(["notes"])
  })
  it("returns 404 for an unknown season", async () => {
    fetch.mockResolvedValue(false)
    expect((await post({ seasonId: "nope", rev: "r", text: "x" })).status).toBe(404)
  })
  it("returns 409 on a revision conflict", async () => {
    conflict = true
    commit.mockRejectedValue(new Error("conflict"))
    expect((await post({ seasonId: "season-a", rev: "old", text: "x" })).status).toBe(409)
  })
})
