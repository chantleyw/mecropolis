import { beforeEach, describe, expect, it, vi } from "vitest"

const auth = vi.fn()
vi.mock("@/auth", () => ({ auth: () => auth() }))
vi.mock("@/lib/env", () => ({ env: { CRON_SECRET: "c".repeat(32) } }))
vi.mock("@/lib/sanity/writeClient", () => ({
  writeClient: { fetch: vi.fn().mockResolvedValue([]) },
}))

import { GET, POST } from "./route"

const url = "http://localhost/api/advance"
const req = (init: RequestInit = {}) => new Request(url, init)

beforeEach(() => auth.mockReset())

describe("/api/advance auth", () => {
  it("POST without a session or bearer returns 401", async () => {
    auth.mockResolvedValue(null)
    expect((await POST(req({ method: "POST" }))).status).toBe(401)
  })
  it("POST with a wrong bearer and no session returns 401", async () => {
    auth.mockResolvedValue(null)
    const res = await POST(req({ method: "POST", headers: { authorization: "Bearer wrong" } }))
    expect(res.status).toBe(401)
  })
  it("GET without a bearer returns 401 even with a session", async () => {
    auth.mockResolvedValue({ user: { name: "demo" } })
    expect((await GET(req())).status).toBe(401)
  })
  it("GET with a wrong bearer returns 401", async () => {
    expect((await GET(req({ headers: { authorization: "Bearer nope" } }))).status).toBe(401)
  })
  it("GET with the cron bearer is accepted", async () => {
    const res = await GET(req({ headers: { authorization: `Bearer ${"c".repeat(32)}` } }))
    expect(res.status).toBe(200)
  })
  it("POST with a session and a non-JSON body returns 400", async () => {
    auth.mockResolvedValue({ user: { name: "demo-body" } })
    const res = await POST(req({ method: "POST", body: "{not json" }))
    expect(res.status).toBe(400)
  })
  it("POST is rate limited per user", async () => {
    auth.mockResolvedValue({ user: { name: "demo-limit" } })
    const codes: number[] = []
    for (let i = 0; i < 21; i++) codes.push((await POST(req({ method: "POST" }))).status)
    expect(codes.at(-1)).toBe(429)
  })
})
