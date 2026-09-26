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
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a])
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])

// A new IP per request keeps the per-IP limiter out of tests about other rules.
let ip = 0

async function uploadReq(query: string, bytes: Uint8Array, type = "image/jpeg", origin = SITE) {
  const cookie = await sessionCookie()
  return run(
    onRequestPost,
    new Request(`${SITE}/api/assets?${query}`, {
      method: "POST",
      headers: { cookie, origin, "content-type": type, "cf-connecting-ip": `203.0.113.${++ip}` },
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
  it("rejects an image sent as a soil report and a PDF sent as a photo", async () => {
    expect((await uploadReq("fieldId=field-a&kind=soilReport", JPEG)).status).toBe(415)
    expect((await uploadReq("fieldId=field-a", PDF, "application/pdf")).status).toBe(415)
    expect(upload).not.toHaveBeenCalled()
  })
  it("rejects a soil report whose bytes are not a PDF", async () => {
    expect(
      (await uploadReq("fieldId=field-a&kind=soilReport", JPEG, "application/pdf")).status,
    ).toBe(415)
  })
  it("rejects a soil report name with path or odd characters", async () => {
    for (const name of ["../x.pdf", "report.exe", "a<b>.pdf"]) {
      const q = new URLSearchParams({ fieldId: "field-a", kind: "soilReport", name })
      expect((await uploadReq(q.toString(), PDF, "application/pdf")).status).toBe(400)
    }
  })
  it("stores a soil report as a file asset and deletes the old one", async () => {
    upload.mockResolvedValue({ _id: "file-new" })
    const q = "fieldId=field-a&kind=soilReport&name=Lab%20test%202026.pdf"
    const res = await uploadReq(q, PDF, "application/pdf")
    expect(res.status).toBe(201)
    expect(upload).toHaveBeenCalledWith(
      "file",
      expect.any(Blob),
      expect.objectContaining({ filename: "Lab test 2026.pdf", contentType: "application/pdf" }),
    )
    expect(fetch.mock.calls[0]?.[0]).toContain('"oldAsset": soilReport.asset._ref')
    const [, fn] = patch.mock.calls[0] as [string, (p: { set: (v: unknown) => unknown }) => unknown]
    const set = vi.fn()
    fn({ set })
    expect(set).toHaveBeenCalledWith({
      soilReport: { _type: "file", asset: { _type: "reference", _ref: "file-new" } },
    })
    expect(del).toHaveBeenCalledWith("image-old")
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ kind: "soilReport" }))
  })
  it("returns 413 for a soil report over 10 MB", async () => {
    const big = new Uint8Array(10 * 1024 * 1024 + 1)
    big.set(PDF)
    expect(
      (await uploadReq("fieldId=field-a&kind=soilReport", big, "application/pdf")).status,
    ).toBe(413)
  })
  it("returns 404 for an unknown field", async () => {
    fetch.mockResolvedValue({ field: null, recent: 0 })
    expect((await uploadReq("fieldId=nope", JPEG)).status).toBe(404)
  })
})
