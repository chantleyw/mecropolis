import type { FunctionContext, ScheduledFunctionContext } from "@sanity/functions"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { handler as nightly } from "../functions/nightly-reconcile/index"
import { handler as onObservation } from "../functions/reconcile-on-observation/index"

const context = {} as FunctionContext
const scheduledContext = {} as ScheduledFunctionContext
const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock)
  vi.stubEnv("CRON_SECRET", "s".repeat(32))
  fetchMock.mockResolvedValue(new Response("{}", { status: 200 }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  fetchMock.mockReset()
})

function sentRequest() {
  const [url, init] = fetchMock.mock.calls[0] ?? []
  const headers = new Headers(init?.headers)
  return { url, authorization: headers.get("authorization"), body: JSON.parse(String(init?.body)) }
}

describe("reconcile-on-observation", () => {
  it("posts the season to /api/advance with the bearer token", async () => {
    await onObservation({ context, event: { data: { seasonId: "season-1" } } })
    expect(sentRequest()).toEqual({
      url: "https://mecropolis.pages.dev/api/advance",
      authorization: `Bearer ${"s".repeat(32)}`,
      body: { seasonId: "season-1" },
    })
  })

  it("does nothing for a document without a season", async () => {
    await onObservation({ context, event: { data: { seasonId: null } } })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("throws when the secret is missing", async () => {
    vi.stubEnv("CRON_SECRET", "")
    await expect(
      onObservation({ context, event: { data: { seasonId: "season-1" } } }),
    ).rejects.toThrow("CRON_SECRET is not set")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("skips a season the reconciler does not walk (review or deleted)", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 404 }))
    await expect(
      onObservation({ context, event: { data: { seasonId: "season-1" } } }),
    ).resolves.toBeUndefined()
  })

  it("throws on a failed call so the stack logs show it", async () => {
    fetchMock.mockResolvedValue(new Response("conflict", { status: 409 }))
    await expect(
      onObservation({ context, event: { data: { seasonId: "season-1" } } }),
    ).rejects.toThrow("/api/advance returned 409: conflict")
  })
})

describe("nightly-reconcile", () => {
  it("posts without a season so every season is walked", async () => {
    await nightly({ context: scheduledContext })
    expect(sentRequest().body).toEqual({})
    expect(sentRequest().authorization).toBe(`Bearer ${"s".repeat(32)}`)
  })

  it("throws on a failed call", async () => {
    fetchMock.mockResolvedValue(new Response("nope", { status: 401 }))
    await expect(nightly({ context: scheduledContext })).rejects.toThrow("returned 401")
  })
})
