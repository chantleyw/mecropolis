import { beforeEach, describe, expect, it, vi } from "vitest"

const query = vi.fn()
const createIfNotExists = vi.fn()
const commit = vi.fn()
const { fetchPestOccurrences } = vi.hoisted(() => ({ fetchPestOccurrences: vi.fn() }))
vi.mock("../_lib/sanity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../_lib/sanity")>()),
  readClient: () => ({ fetch: query }),
  writeClient: () => ({ fetch: query, transaction: () => ({ createIfNotExists, commit }) }),
}))
vi.mock("../../src/lib/data/gbif", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/lib/data/gbif")>()),
  fetchPestOccurrences,
}))

import { request, run, sessionCookie, SITE } from "../_test/context"
import { onRequestPost } from "./pests"

const season = {
  fieldId: "field-1",
  coordinates: { lat: -33.4, lng: 18.7 },
  pestWatch: [{ pest: "Plutella xylostella", gbifTaxonKey: 1 }],
}
const occurrences = Array.from({ length: 20 }, (_, i) => ({
  key: i + 1,
  eventDate: "2026-09-01",
  decimalLatitude: -33.4 + i * 0.01,
  decimalLongitude: 18.7,
}))

async function store() {
  const cookie = await sessionCookie()
  return run(
    onRequestPost,
    request("/api/pests", {
      method: "POST",
      body: { seasonId: "season-1" },
      headers: { cookie, origin: SITE },
    }),
  )
}

beforeEach(() => {
  query.mockReset()
  createIfNotExists.mockReset()
  commit.mockReset().mockResolvedValue({})
  fetchPestOccurrences.mockReset().mockResolvedValue(occurrences)
})

describe("POST /api/pests", () => {
  it("rejects a store once the hourly cap is reached, before calling GBIF", async () => {
    query.mockResolvedValueOnce(200)
    expect((await store()).status).toBe(429)
    expect(fetchPestOccurrences).not.toHaveBeenCalled()
  })

  it("trims the batch to what is left of the hourly cap, nearest first", async () => {
    query.mockResolvedValueOnce(195).mockResolvedValueOnce(season)
    const res = await store()
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ reports: 5 })
    expect(createIfNotExists).toHaveBeenCalledTimes(5)
    expect(createIfNotExists.mock.calls[0]?.[0]).toMatchObject({ sourceId: "1", distanceKm: 0 })
  })
})
