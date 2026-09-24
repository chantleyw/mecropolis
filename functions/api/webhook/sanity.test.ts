import { beforeEach, describe, expect, it, vi } from "vitest"

const fetch = vi.fn()
vi.mock("../../_lib/sanity", () => ({
  writeClient: () => ({ fetch }),
  isRevisionConflict: () => false,
}))

import { signPayload } from "../../../src/lib/webhook/signature"
import { env, run } from "../../_test/context"
import { onRequestPost } from "./sanity"

const SITE = "https://mecropolis.pages.dev"

function hook(raw: string, signature: string | null) {
  return new Request(`${SITE}/api/webhook/sanity`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(signature ? { "sanity-webhook-signature": signature } : {}),
    },
    body: raw,
  })
}

const payload = JSON.stringify({ _id: "observation-1", _type: "observation", seasonId: "season-a" })

beforeEach(() => fetch.mockReset().mockResolvedValue([]))

describe("/api/webhook/sanity", () => {
  it("rejects a missing signature", async () => {
    const res = await run(onRequestPost, hook(payload, null))
    expect(res.status).toBe(401)
    expect(fetch).not.toHaveBeenCalled()
  })
  it("rejects a signature made with another secret", async () => {
    const res = await run(onRequestPost, hook(payload, await signPayload(payload, "x".repeat(32))))
    expect(res.status).toBe(401)
  })
  it("reconciles the season named in a signed payload", async () => {
    const sig = await signPayload(payload, env.SANITY_WEBHOOK_SECRET)
    const res = await run(onRequestPost, hook(payload, sig))
    // The mocked fetch returns no season rows, so reconcile reports the season as not found.
    expect(res.status).toBe(404)
    expect(fetch).toHaveBeenCalledWith(expect.any(String), { id: "season-a" })
  })
  it("ignores a document without a season", async () => {
    const raw = JSON.stringify({ _id: "observation-2", _type: "observation", seasonId: null })
    const res = await run(
      onRequestPost,
      hook(raw, await signPayload(raw, env.SANITY_WEBHOOK_SECRET)),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: "ignored", reason: "No season on document" })
    expect(fetch).not.toHaveBeenCalled()
  })
  it("rejects a dotted season id even when signed", async () => {
    const raw = JSON.stringify({ _id: "o", _type: "observation", seasonId: "drafts.season-a" })
    const res = await run(
      onRequestPost,
      hook(raw, await signPayload(raw, env.SANITY_WEBHOOK_SECRET)),
    )
    expect(res.status).toBe(400)
  })
  it("returns 404 when no secret is configured", async () => {
    const res = await onRequestPost({
      request: hook(payload, await signPayload(payload, env.SANITY_WEBHOOK_SECRET)),
      env: { ...env, SANITY_WEBHOOK_SECRET: undefined },
      params: {},
    } as unknown as EventContext<unknown, string, Record<string, unknown>>)
    expect(res.status).toBe(404)
  })
})
