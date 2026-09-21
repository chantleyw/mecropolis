import { beforeEach, describe, expect, it, vi } from "vitest"

const auth = vi.fn()
vi.mock("@/auth", () => ({ auth: () => auth() }))
vi.mock("@/lib/env", () => ({ env: {} }))
vi.mock("@/lib/sanity/writeClient", () => ({
  writeClient: { fetch: vi.fn().mockResolvedValue(null), createOrReplace: vi.fn() },
}))

import { GET } from "./route"

const req = () => new Request("http://localhost/api/weather?fieldId=f1")

beforeEach(() => auth.mockReset())

describe("/api/weather auth", () => {
  it("returns 401 without a session", async () => {
    auth.mockResolvedValue(null)
    expect((await GET(req())).status).toBe(401)
  })
  it("returns 429 once the per-user limit is exceeded", async () => {
    auth.mockResolvedValue({ user: { name: "limit-user" } })
    const codes: number[] = []
    for (let i = 0; i < 31; i++) codes.push((await GET(req())).status)
    expect(codes.at(-1)).toBe(429)
  })
})
