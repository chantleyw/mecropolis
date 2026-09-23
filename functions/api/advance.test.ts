import { beforeEach, describe, expect, it, vi } from "vitest"

const fetch = vi.fn()
vi.mock("../_lib/sanity", () => ({
  writeClient: () => ({ fetch }),
  isRevisionConflict: () => false,
}))

import { request, run, sessionCookie, SITE } from "../_test/context"
import { onRequestGet, onRequestPost } from "./advance"

const bearer = { authorization: `Bearer ${"c".repeat(32)}` }

async function signedPost(body: unknown, origin = SITE) {
  const cookie = await sessionCookie()
  return run(
    onRequestPost,
    request("/api/advance", { method: "POST", body, headers: { cookie, origin } }),
  )
}

beforeEach(() => fetch.mockReset().mockResolvedValue([]))

describe("/api/advance auth", () => {
  it("POST without a session or bearer returns 401", async () => {
    const res = await run(
      onRequestPost,
      request("/api/advance", { method: "POST", body: {}, headers: { origin: SITE } }),
    )
    expect(res.status).toBe(401)
  })
  it("POST with a session from another origin returns 403", async () => {
    expect((await signedPost({}, "https://evil.example")).status).toBe(403)
  })
  it("GET without a bearer returns 401 even with a session", async () => {
    const cookie = await sessionCookie()
    const res = await run(onRequestGet, request("/api/advance", { headers: { cookie } }))
    expect(res.status).toBe(401)
  })
  it("GET with a wrong bearer returns 401", async () => {
    const res = await run(
      onRequestGet,
      request("/api/advance", { headers: { authorization: "Bearer nope" } }),
    )
    expect(res.status).toBe(401)
  })
  it("GET with the scheduler bearer reconciles", async () => {
    const res = await run(onRequestGet, request("/api/advance", { headers: bearer }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ outcomes: [] })
  })
  it("POST with the bearer needs no Origin", async () => {
    const res = await run(
      onRequestPost,
      request("/api/advance", { method: "POST", body: {}, headers: bearer }),
    )
    expect(res.status).toBe(200)
  })
  it("POST for an unknown season returns 404", async () => {
    expect((await signedPost({ seasonId: "nope" })).status).toBe(404)
  })
  it("rejects a dotted season id", async () => {
    expect((await signedPost({ seasonId: "drafts.x" })).status).toBe(400)
  })
})
