import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const query = vi.fn()
vi.mock("../_lib/sanity", () => ({
  readClient: () => ({ fetch: query }),
  SANITY_API_VERSION: "2026-01-01",
}))

import { request, run, sessionCookie } from "../_test/context"
import { onRequestGet } from "./history"

const upstream = vi.fn()

const note = (key: string, text: string) => ({
  _type: "seasonNote",
  _key: key,
  createdAt: "2026-09-20T08:00:00Z",
  body: [{ _type: "block", children: [{ text, marks: [] }] }],
})

// Serves the transactions listing and each revision's document from `docs`.
function serve(lines: { id: string; create?: boolean }[], docs: Record<string, unknown>) {
  upstream.mockImplementation((url: string) => {
    const body = url.includes("/transactions/")
      ? lines
          .map((l) =>
            JSON.stringify({
              id: l.id,
              timestamp: "2026-09-24T08:00:00Z",
              mutations: [l.create ? { create: {} } : { patch: {} }],
            }),
          )
          .join("\n")
      : JSON.stringify({ documents: [docs[new URL(url).searchParams.get("revision") ?? ""]] })
    return Promise.resolve(new Response(body))
  })
}

async function get(id: string) {
  const cookie = await sessionCookie()
  return run(onRequestGet, request(`/api/history?id=${id}`, { headers: { cookie } }))
}

beforeEach(() => {
  query.mockReset().mockResolvedValue("season")
  upstream.mockReset()
  vi.stubGlobal("fetch", upstream)
})
afterEach(() => vi.unstubAllGlobals())

describe("/api/history", () => {
  it("requires a session", async () => {
    const res = await run(onRequestGet, request("/api/history?id=season-a"))
    expect(res.status).toBe(401)
  })
  it("rejects a dotted id", async () => {
    expect((await get("drafts.season-a")).status).toBe(400)
  })
  it("returns 404 for a type without a timeline", async () => {
    query.mockResolvedValue("farm")
    expect((await get("farm-a")).status).toBe(404)
    expect(upstream).not.toHaveBeenCalled()
  })
  it("returns each revision with the stage and the notes it changed", async () => {
    const lines = [
      { id: "rev2", timestamp: "2026-09-24T08:00:00Z", mutations: [{ patch: { id: "season-a" } }] },
      {
        id: "rev1",
        timestamp: "2026-09-23T08:00:00Z",
        mutations: [{ create: { _id: "season-a" } }],
      },
    ]
    upstream.mockImplementation((url: string) => {
      const body = url.includes("/transactions/")
        ? lines.map((l) => JSON.stringify(l)).join("\n")
        : JSON.stringify({
            documents: [
              url.includes("rev2")
                ? { stage: "growing", notes: [note("k1", "Rain 12 mm")] }
                : { stage: "planning" },
            ],
          })
      return Promise.resolve(new Response(body))
    })
    const res = await get("season-a")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      entries: [
        {
          rev: "rev2",
          timestamp: "2026-09-24T08:00:00Z",
          action: "updated",
          state: "growing",
          notes: [{ key: "k1", change: "added", title: "Rain 12 mm", restoreFrom: null }],
        },
        {
          rev: "rev1",
          timestamp: "2026-09-23T08:00:00Z",
          action: "created",
          state: "planning",
          notes: [],
        },
      ],
    })
    const [url, init] = upstream.mock.calls[0] as [string, RequestInit]
    expect(url).toContain("excludeContent=true")
    expect(init.headers).toEqual({ authorization: "Bearer token" })
  })
  it("names the one note a revision changed and where to restore it from", async () => {
    serve([{ id: "rev3" }, { id: "rev2" }, { id: "rev1", create: true }], {
      rev3: { notes: [note("k2", "Kept")] },
      rev2: { notes: [note("k1", "Second draft"), note("k2", "Kept")] },
      rev1: { notes: [note("k1", "First draft"), note("k2", "Kept")] },
    })
    const { entries } = (await (await get("season-a")).json()) as {
      entries: { rev: string; notes: unknown[] }[]
    }
    expect(entries.map((e) => e.notes)).toEqual([
      [{ key: "k1", change: "deleted", title: "Second draft", restoreFrom: "rev2" }],
      [{ key: "k1", change: "edited", title: "Second draft", restoreFrom: "rev2" }],
      [
        { key: "k1", change: "added", title: "First draft", restoreFrom: "rev1" },
        { key: "k2", change: "added", title: "Kept", restoreFrom: null },
      ],
    ])
  })
  it("reports an upstream failure as 502", async () => {
    upstream.mockResolvedValue(new Response("no", { status: 500 }))
    expect((await get("season-a")).status).toBe(502)
  })
})
