import { beforeEach, describe, expect, it, vi } from "vitest"

const fetch = vi.fn()
const commit = vi.fn()
const set = vi.fn()
const conflict = { statusCode: 409 }
vi.mock("../../../_lib/sanity", () => ({
  writeClient: () => ({
    fetch,
    transaction: () => {
      const tx = {
        patch: (_id: string, fn: (p: unknown) => unknown) => {
          fn({ ifRevisionId: () => ({ set }) })
          return tx
        },
        commit,
      }
      return tx
    },
  }),
  isRevisionConflict: (e: unknown) => e === conflict,
}))

import { request, run, sessionCookie, SITE } from "../../../_test/context"
import { onRequestPost } from "./[action]"

async function post(id: string, action: string, body: unknown = {}) {
  const cookie = await sessionCookie()
  return run(
    onRequestPost,
    request(`/api/recommendations/${id}/${action}`, {
      method: "POST",
      body,
      headers: { cookie, origin: SITE },
    }),
    { id, action },
  )
}

beforeEach(() => {
  fetch.mockReset()
  commit.mockReset().mockResolvedValue({})
  set.mockReset()
})

describe("recommendation actions", () => {
  it("approves a proposed recommendation", async () => {
    fetch.mockResolvedValue({ _rev: "r1", status: "proposed" })
    const res = await post("rec-1", "approve", { decisionNote: "ok" })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: "rec-1", status: "approved" })
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved", reviewedBy: "demo", decisionNote: "ok" }),
    )
  })
  it("rejects a transition the state machine forbids", async () => {
    fetch.mockResolvedValue({ _rev: "r1", status: "rejected" })
    expect((await post("rec-1", "complete")).status).toBe(409)
    expect(commit).not.toHaveBeenCalled()
  })
  it("reports a revision conflict as 409", async () => {
    fetch.mockResolvedValue({ _rev: "r1", status: "proposed" })
    commit.mockRejectedValue(conflict)
    const res = await post("rec-1", "approve")
    expect(res.status).toBe(409)
    expect(((await res.json()) as { error: string }).error).toMatch(/reload/)
  })
  it("returns 404 for an unknown action", async () => {
    expect((await post("rec-1", "delete")).status).toBe(404)
  })
  it("returns 404 for a missing recommendation", async () => {
    fetch.mockResolvedValue(null)
    expect((await post("rec-1", "approve")).status).toBe(404)
  })
  it("requires a session", async () => {
    const res = await run(
      onRequestPost,
      request("/api/recommendations/rec-1/approve", {
        method: "POST",
        body: {},
        headers: { origin: SITE },
      }),
      { id: "rec-1", action: "approve" },
    )
    expect(res.status).toBe(401)
  })
})
