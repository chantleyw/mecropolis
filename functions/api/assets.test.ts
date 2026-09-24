import { beforeEach, describe, expect, it, vi } from "vitest"

const fetch = vi.fn()
const upload = vi.fn()
const create = vi.fn()
const commit = vi.fn()
const del = vi.fn()
const patch = vi.fn()
vi.mock("../_lib/sanity", () => ({
  writeClient: () => ({
    fetch,
    create,
    assets: { upload },
    transaction: () => {
      const tx = {
        patch: (id: string, fn: (p: unknown) => unknown) => (patch(id, fn), tx),
        delete: del,
        commit,
      }
      return tx
    },
  }),
}))

import { run, sessionCookie, SITE } from "../_test/context"
import { onRequestPost } from "./assets"

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])

async function uploadReq(query: string, bytes: Uint8Array, type = "image/jpeg", origin = SITE) {
  const cookie = await sessionCookie()
  return run(
    onRequestPost,
    new Request(`${SITE}/api/assets?${query}`, {
      method: "POST",
      headers: { cookie, origin, "content-type": type, "cf-connecting-ip": "203.0.113.9" },
      body: bytes,
    }),
  )
}

beforeEach(() => {
  fetch
    .mockReset()
    .mockResolvedValue({ field: { _id: "field-a", oldAsset: "image-old" }, recent: 0 })
  upload.mockReset().mockResolvedValue({ _id: "image-new" })
  create.mockReset().mockResolvedValue({})
  commit.mockReset().mockResolvedValue({})
  del.mockReset()
  patch.mockReset()
})

describe("/api/assets", () => {
  it("rejects a cross-origin upload", async () => {
    expect(
      (await uploadReq("fieldId=field-a", JPEG, "image/jpeg", "https://evil.example")).status,
    ).toBe(403)
  })
  it("rejects a type outside the allowlist", async () => {
    expect((await uploadReq("fieldId=field-a", JPEG, "image/svg+xml")).status).toBe(415)
  })
  it("rejects bytes that do not match the declared type", async () => {
    expect((await uploadReq("fieldId=field-a", PNG_BYTES, "image/jpeg")).status).toBe(415)
    expect(upload).not.toHaveBeenCalled()
  })
  it("rejects a focus point outside 0-1 and a dotted field id", async () => {
    expect((await uploadReq("fieldId=field-a&x=2", JPEG)).status).toBe(400)
    expect((await uploadReq("fieldId=drafts.a", JPEG)).status).toBe(400)
  })
  it("returns 429 once the hourly cap is reached", async () => {
    fetch.mockResolvedValue({ field: { _id: "field-a", oldAsset: null }, recent: 20 })
    expect((await uploadReq("fieldId=field-a", JPEG)).status).toBe(429)
    expect(upload).not.toHaveBeenCalled()
  })
  it("uploads with LQIP and palette, sets the photo and deletes the old asset", async () => {
    const res = await uploadReq("fieldId=field-a&x=0.9&y=0.3", JPEG)
    expect(res.status).toBe(201)
    expect(upload).toHaveBeenCalledWith(
      "image",
      expect.any(Blob),
      expect.objectContaining({ extract: ["lqip", "palette"] }),
    )
    const [id, fn] = patch.mock.calls[0] as [
      string,
      (p: { set: (v: unknown) => unknown }) => unknown,
    ]
    expect(id).toBe("field-a")
    const set = vi.fn()
    fn({ set })
    expect(set).toHaveBeenCalledWith({
      photo: expect.objectContaining({
        asset: { _type: "reference", _ref: "image-new" },
        hotspot: expect.objectContaining({ x: 0.8, y: 0.3 }),
      }),
    })
    expect(del).toHaveBeenCalledWith("image-old")
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ _type: "photoUpload", user: "demo" }),
    )
  })
  it("returns 404 for an unknown field", async () => {
    fetch.mockResolvedValue({ field: null, recent: 0 })
    expect((await uploadReq("fieldId=nope", JPEG)).status).toBe(404)
  })
})
