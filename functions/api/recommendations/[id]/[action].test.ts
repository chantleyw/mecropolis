import { beforeEach, describe, expect, it, vi } from "vitest"

const fetch = vi.fn()
const action = vi.fn()
const commit = vi.fn()
const set = vi.fn()
const ifRevisionId = vi.fn(() => ({ set }))
const conflict = { statusCode: 409 }
const gone = { statusCode: 404 }
vi.mock("../../../_lib/sanity", () => ({
  writeClient: () => ({
    fetch,
    action,
    transaction: () => {
      const tx = {
        patch: (_id: string, fn: (p: unknown) => unknown) => {
          fn({ ifRevisionId })
          return tx
        },
        commit,
      }
      return tx
    },
  }),
  isRevisionConflict: (e: unknown) => e === conflict,
  isNotFound: (e: unknown) => e === gone,
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

const draft = { _id: "drafts.rec-1", _rev: "d1", status: "proposed" }

beforeEach(() => {
  fetch.mockReset()
  action.mockReset().mockResolvedValue({ transactionId: "tx-publish" })
  commit.mockReset().mockResolvedValue({})
  set.mockReset()
  ifRevisionId.mockClear()
})

describe("recommendation actions", () => {
  it("publishes a proposed draft, then records the approval on the published doc", async () => {
    fetch.mockResolvedValue([draft])
    const res = await post("rec-1", "approve", { decisionNote: "ok" })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: "rec-1", status: "approved" })
    expect(action).toHaveBeenCalledWith({
      actionType: "sanity.action.document.publish",
      draftId: "drafts.rec-1",
      publishedId: "rec-1",
      ifDraftRevisionId: "d1",
    })
    expect(ifRevisionId).toHaveBeenCalledWith("tx-publish")
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved", reviewedBy: "demo", decisionNote: "ok" }),
    )
  })
  it("rejects by publishing too, so the decision stays in history", async () => {
    fetch.mockResolvedValue([draft])
    expect((await post("rec-1", "reject")).status).toBe(200)
    expect(action).toHaveBeenCalledOnce()
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ status: "rejected" }))
  })
  it("completes a published recommendation without publishing", async () => {
    fetch.mockResolvedValue([{ _id: "rec-1", _rev: "p1", status: "approved" }])
    expect((await post("rec-1", "complete")).status).toBe(200)
    expect(action).not.toHaveBeenCalled()
    expect(ifRevisionId).toHaveBeenCalledWith("p1")
  })
  it("retries the status patch on a doc published while still proposed", async () => {
    fetch.mockResolvedValue([{ _id: "rec-1", _rev: "p1", status: "proposed" }])
    expect((await post("rec-1", "approve")).status).toBe(200)
    expect(action).not.toHaveBeenCalled()
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ status: "approved" }))
  })
  it("rejects a transition the state machine forbids", async () => {
    fetch.mockResolvedValue([{ _id: "rec-1", _rev: "r1", status: "rejected" }])
    expect((await post("rec-1", "complete")).status).toBe(409)
    expect(commit).not.toHaveBeenCalled()
  })
  it("reports a draft revision conflict as 409", async () => {
    fetch.mockResolvedValue([draft])
    action.mockRejectedValue(conflict)
    expect((await post("rec-1", "approve")).status).toBe(409)
    expect(commit).not.toHaveBeenCalled()
  })
  it("reports a draft another review already published as 409", async () => {
    fetch.mockResolvedValue([draft])
    action.mockRejectedValue(gone)
    expect((await post("rec-1", "approve")).status).toBe(409)
  })
  it("reports a revision conflict as 409", async () => {
    fetch.mockResolvedValue([{ _id: "rec-1", _rev: "r1", status: "approved" }])
    commit.mockRejectedValue(conflict)
    const res = await post("rec-1", "complete")
    expect(res.status).toBe(409)
    expect(((await res.json()) as { error: string }).error).toMatch(/reload/)
  })
  it("returns 404 for an unknown action", async () => {
    expect((await post("rec-1", "delete")).status).toBe(404)
  })
  it("returns 404 for a missing recommendation", async () => {
    fetch.mockResolvedValue([])
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
