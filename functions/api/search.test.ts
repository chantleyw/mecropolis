import { beforeEach, describe, expect, it, vi } from "vitest"

const query = vi.fn()
const create = vi.fn()
const commit = vi.fn()
const ifRevisionId = vi.fn()
vi.mock("../_lib/sanity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../_lib/sanity")>()),
  writeClient: () => ({
    fetch: query,
    create,
    patch: () => ({
      ifRevisionId: (rev: string) => (ifRevisionId(rev), { set: () => ({ commit }) }),
    }),
  }),
}))

import { request, run, sessionCookie } from "../_test/context"
import { onRequestGet, SEARCH_COUNTER_ID, SEARCHES_PER_DAY } from "./search"

const hit = { _id: "obs-1", _type: "observation", text: "Aphids on the flag leaf" }

async function search(qs: string, ip = "203.0.113.7") {
  const cookie = await sessionCookie()
  return run(
    onRequestGet,
    request(`/api/search?${qs}`, { headers: { cookie, "cf-connecting-ip": ip } }),
  )
}

const recent = (n: number) => Array.from({ length: n }, () => new Date().toISOString())

beforeEach(() => {
  query.mockReset()
  create.mockReset().mockResolvedValue({})
  commit.mockReset().mockResolvedValue({})
  ifRevisionId.mockReset()
})

describe("/api/search", () => {
  it("requires a session", async () => {
    const res = await run(onRequestGet, request("/api/search?q=aphids&farm=a"))
    expect(res.status).toBe(401)
  })

  it("rejects a short query or a bad farm slug before counting", async () => {
    expect((await search("q=ap&farm=a", "203.0.113.8")).status).toBe(400)
    expect((await search("q=aphids&farm=A.B", "203.0.113.8")).status).toBe(400)
    expect(query).not.toHaveBeenCalled()
  })

  it("creates the counter on the first search and returns the hits", async () => {
    query.mockResolvedValueOnce(null).mockResolvedValueOnce([hit])
    const res = await search("q=aphids&farm=swartland", "203.0.113.9")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ hits: [hit] })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ _id: SEARCH_COUNTER_ID, _type: "writeCounter" }),
    )
    expect(query.mock.calls[1]?.[1]).toEqual({ q: "aphids", farm: "swartland" })
  })

  it("returns 429 once today's cap is reached, without querying embeddings", async () => {
    query.mockResolvedValueOnce({ _rev: "r1", writes: recent(SEARCHES_PER_DAY) })
    const res = await search("q=aphids&farm=swartland", "203.0.113.10")
    expect(res.status).toBe(429)
    expect(query).toHaveBeenCalledTimes(1)
    expect(commit).not.toHaveBeenCalled()
  })

  it("drops entries older than a day and retries after a revision conflict", async () => {
    const old = new Date(Date.now() - 2 * 86_400_000).toISOString()
    query
      .mockResolvedValueOnce({ _rev: "r1", writes: [old, ...recent(SEARCHES_PER_DAY - 1)] })
      .mockResolvedValueOnce({ _rev: "r2", writes: recent(1) })
      .mockResolvedValueOnce([])
    commit.mockRejectedValueOnce({ statusCode: 409 })
    const res = await search("q=aphids&farm=swartland", "203.0.113.11")
    expect(res.status).toBe(200)
    expect(ifRevisionId.mock.calls).toEqual([["r1"], ["r2"]])
  })
})
