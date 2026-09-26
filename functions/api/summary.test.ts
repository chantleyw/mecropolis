import { beforeEach, describe, expect, it, vi } from "vitest"

const query = vi.fn()
const create = vi.fn()
const commit = vi.fn()
const set = vi.fn()
const prompt = vi.fn()
const withConfig = vi.fn()
const counterWrites = vi.fn()
vi.mock("../_lib/sanity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../_lib/sanity")>()),
  writeClient: () => ({
    fetch: query,
    create,
    patch: (id: string) => ({
      ifRevisionId: () => ({
        set: (value: unknown) => (counterWrites(value), { commit }),
      }),
      set: (value: unknown) => (set(id, value), { commit }),
    }),
    withConfig: (config: unknown) => (withConfig(config), { agent: { action: { prompt } } }),
  }),
}))

import { request, run, sessionCookie, SITE } from "../_test/context"
import { onRequestPost, SUMMARIES_PER_DAY, SUMMARIES_PER_HOUR, SUMMARY_COUNTER_ID } from "./summary"

const records = {
  crop: "Wheat",
  field: "North A",
  year: 2026,
  stage: "vegetative",
  plantingDate: "2026-05-10",
  derivedMaturityDate: null,
  stageChanges: [{ stage: "emerged", effectiveDate: "2026-05-24", gddTotal: 140 }],
  notes: [],
  observations: [{ date: "2026-07-01T08:00:00Z", notes: "Aphids on the flag leaf" }],
  treatments: [],
}

async function summarise(body: unknown, ip: string, origin = SITE) {
  const cookie = await sessionCookie()
  return run(
    onRequestPost,
    request("/api/summary", {
      method: "POST",
      body,
      headers: { cookie, origin, "cf-connecting-ip": ip },
    }),
  )
}

const recent = (n: number) => Array.from({ length: n }, () => new Date().toISOString())

beforeEach(() => {
  query.mockReset()
  create.mockReset().mockResolvedValue({})
  commit.mockReset().mockResolvedValue({})
  set.mockReset()
  prompt.mockReset()
  withConfig.mockReset()
  counterWrites.mockReset()
})

describe("/api/summary", () => {
  it("requires a session and the same origin", async () => {
    const anon = request("/api/summary", {
      method: "POST",
      body: { seasonId: "s1" },
      headers: { origin: SITE },
    })
    expect((await run(onRequestPost, anon)).status).toBe(401)
    expect((await summarise({ seasonId: "s1" }, "203.0.113.20", "https://evil.test")).status).toBe(
      403,
    )
  })

  it("rejects a dotted season id", async () => {
    expect((await summarise({ seasonId: "drafts.s1" }, "203.0.113.21")).status).toBe(400)
    expect(query).not.toHaveBeenCalled()
  })

  it("returns 422 without spending a credit when the season has no records", async () => {
    query.mockResolvedValueOnce({ ...records, observations: [] })
    const res = await summarise({ seasonId: "s1" }, "203.0.113.22")
    expect(res.status).toBe(422)
    expect(prompt).not.toHaveBeenCalled()
  })

  it("returns 429 once the hourly cap is reached", async () => {
    query
      .mockResolvedValueOnce(records)
      .mockResolvedValueOnce({ _rev: "r1", writes: recent(SUMMARIES_PER_HOUR) })
    const res = await summarise({ seasonId: "s1" }, "203.0.113.23")
    expect(res.status).toBe(429)
    expect(prompt).not.toHaveBeenCalled()
  })

  it("returns 429 once the daily cap is reached, counting calls older than an hour", async () => {
    const earlier = Array.from({ length: SUMMARIES_PER_DAY }, () =>
      new Date(Date.now() - 2 * 3_600_000).toISOString(),
    )
    query.mockResolvedValueOnce(records).mockResolvedValueOnce({ _rev: "r1", writes: earlier })
    const res = await summarise({ seasonId: "s1" }, "203.0.113.26")
    expect(res.status).toBe(429)
    expect(prompt).not.toHaveBeenCalled()
  })

  it("keeps a day of call times in the counter", async () => {
    const old = new Date(Date.now() - 2 * 86_400_000).toISOString()
    const earlier = new Date(Date.now() - 2 * 3_600_000).toISOString()
    query
      .mockResolvedValueOnce(records)
      .mockResolvedValueOnce({ _rev: "r1", writes: [old, earlier] })
    prompt.mockResolvedValueOnce("Summary.")
    expect((await summarise({ seasonId: "s1" }, "203.0.113.27")).status).toBe(200)
    expect(counterWrites.mock.calls[0]?.[0]).toEqual({ writes: [earlier, expect.any(String)] })
  })

  it("prompts on API vX with the records and stores the summary on the season", async () => {
    query.mockResolvedValueOnce(records).mockResolvedValueOnce(null)
    prompt.mockResolvedValueOnce("  Wheat on North A emerged on 24 May at 140 GDD.  ")
    const res = await summarise({ seasonId: "s1" }, "203.0.113.24")
    expect(res.status).toBe(200)
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ _id: SUMMARY_COUNTER_ID }))
    expect(withConfig).toHaveBeenCalledWith({ apiVersion: "vX" })
    const call = prompt.mock.calls[0]?.[0] as { instructionParams: { records: string } }
    expect(JSON.parse(call.instructionParams.records)).toEqual(records)
    const text = "Wheat on North A emerged on 24 May at 140 GDD."
    expect(set).toHaveBeenCalledWith("s1", {
      aiSummary: { text, generatedAt: expect.any(String) },
    })
    expect(await res.json()).toEqual({ aiSummary: { text, generatedAt: expect.any(String) } })
  })

  it("does not store an empty answer", async () => {
    query.mockResolvedValueOnce(records).mockResolvedValueOnce(null)
    prompt.mockResolvedValueOnce("   ")
    const res = await summarise({ seasonId: "s1" }, "203.0.113.25")
    expect(res.status).toBe(502)
    expect(set).not.toHaveBeenCalled()
  })
})
