import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchPsdYield } from "./psd"

const row = (attributeId: number, unitId: number, value: number | null) => ({
  commodityCode: "0410000",
  countryCode: "SF",
  marketYear: "2024",
  calendarYear: "2025",
  month: "11",
  attributeId,
  unitId,
  value,
})

function stub(body: unknown, status = 200) {
  const fn = vi.fn<(url: string) => Promise<Response>>(
    async () => new Response(JSON.stringify(body), { status }),
  )
  vi.stubGlobal("fetch", fn)
  return fn
}

afterEach(() => vi.unstubAllGlobals())

const params = { commodityCode: "0410000", countryCode: "SF", fromYear: 2024, toYear: 2024 }

describe("fetchPsdYield", () => {
  it("builds the URL and converts MT/HA to kg/ha", async () => {
    const fn = stub([row(4, 4, 505), row(184, 26, 3.8218)])
    const out = await fetchPsdYield(params, "k")
    expect(out).toEqual([{ year: 2024, kgPerHa: 3821.8 }])
    expect(fn.mock.calls[0]?.[0]).toBe(
      "https://api.fas.usda.gov/api/psd/commodity/0410000/country/SF/year/2024?api_key=k",
    )
  })

  it("omits a year with no yield row", async () => {
    stub([row(4, 4, 505)])
    expect(await fetchPsdYield(params, "k")).toEqual([])
  })

  it("throws on an unknown unit id", async () => {
    stub([row(184, 99, 3)])
    await expect(fetchPsdYield(params, "k")).rejects.toThrow("Unknown PSD yield unit id: 99")
  })

  it("rejects a changed response shape", async () => {
    stub([{ attributeId: "184" }])
    await expect(fetchPsdYield(params, "k")).rejects.toThrow("Unexpected response shape")
  })
})
