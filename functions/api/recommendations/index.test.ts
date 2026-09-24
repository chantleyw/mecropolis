import { beforeEach, describe, expect, it, vi } from "vitest"

const fetch = vi.fn()
const create = vi.fn()
vi.mock("../../_lib/sanity", () => ({ writeClient: () => ({ fetch, create }) }))

import { request, run, sessionCookie, SITE } from "../../_test/context"
import { onRequestPost } from "./index"

const body = { seasonId: "season-1", type: "monitor", rationale: "Check canopy after the heat" }

async function post() {
  const cookie = await sessionCookie()
  return run(
    onRequestPost,
    request("/api/recommendations", { method: "POST", body, headers: { cookie, origin: SITE } }),
  )
}

beforeEach(() => {
  fetch.mockReset()
  create.mockReset().mockResolvedValue({ _id: "rec-1" })
})

describe("POST /api/recommendations", () => {
  it("creates a proposed recommendation under the hourly cap", async () => {
    fetch.mockResolvedValue({ fieldId: "field-1", recent: 0 })
    const res = await post()
    expect(res.status).toBe(201)
    expect(create).toHaveBeenCalledOnce()
  })
  it("returns 429 once the hourly cap is reached", async () => {
    fetch.mockResolvedValue({ fieldId: "field-1", recent: 60 })
    expect((await post()).status).toBe(429)
    expect(create).not.toHaveBeenCalled()
  })
})
