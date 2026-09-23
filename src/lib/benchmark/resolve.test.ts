import { describe, expect, it, vi } from "vitest"
import { resolveBenchmarks, type ResolveDeps, type ResolveInput } from "./resolve"
import { benchmarkDoc, syncBenchmarks, type BenchmarkWriter } from "./sync"

const obs = [{ year: 2024, kgPerHa: 3821.8 }]

function deps(over: Partial<ResolveDeps> = {}): ResolveDeps {
  return {
    fetchPsd: vi.fn(async () => obs),
    provinceYield: vi.fn(() => obs),
    fetchWorldBank: vi.fn(async () => obs),
    harvestStatMeta: { sourceUrl: "https://hs", licence: "MIT", retrievedAt: "2026-09-21" },
    today: () => "2026-09-21",
    ...over,
  }
}

const input = (b: ResolveInput["benchmarks"]): ResolveInput => ({
  benchmarks: b,
  commodity: "Wheat",
  psdCountryCode: "SF",
  iso3: "ZAF",
  country: "South Africa",
  province: "Western Cape",
  fromYear: 2020,
  toYear: 2024,
})

describe("resolveBenchmarks", () => {
  it("does not fetch when the crop is unavailable", async () => {
    const d = deps()
    const r = await resolveBenchmarks(input({ unavailableReason: "No public series" }), d)
    expect(r).toEqual({ status: "unavailable", reason: "No public series" })
    expect(d.fetchPsd).not.toHaveBeenCalled()
    expect(d.provinceYield).not.toHaveBeenCalled()
  })

  it("fetches World Bank only when the crop sets an indicator", async () => {
    const d = deps()
    await resolveBenchmarks(input({ psdCommodityCode: "0410000" }), d)
    expect(d.fetchWorldBank).not.toHaveBeenCalled()
    const r = await resolveBenchmarks(input({ worldBankIndicator: "AG.YLD.CREL.KG" }), d)
    expect(d.fetchWorldBank).toHaveBeenCalledWith("ZAF", "AG.YLD.CREL.KG", 2020, 2024)
    expect(r.status === "available" && r.sources[0]).toMatchObject({
      source: "worldbank",
      scope: "national",
      commodity: expect.stringContaining("cereals"),
    })
  })

  it("reports a failing World Bank source but keeps the others", async () => {
    const d = deps({
      fetchWorldBank: vi.fn(async () => {
        throw new Error("boom")
      }),
    })
    const r = await resolveBenchmarks(
      input({ psdCommodityCode: "0410000", worldBankIndicator: "AG.YLD.CREL.KG" }),
      d,
    )
    expect(r.status === "available" && r.partialFailures).toEqual([
      { source: "worldbank", reason: "boom" },
    ])
  })

  it("is unavailable when no source is configured", async () => {
    const r = await resolveBenchmarks(input({}), deps())
    expect(r.status).toBe("unavailable")
  })

  it("combines national and provincial sources", async () => {
    const r = await resolveBenchmarks(
      input({ psdCommodityCode: "0410000", harvestStatProduct: "Wheat" }),
      deps(),
    )
    if (r.status !== "available") throw new Error("expected available")
    expect(r.sources.map((s) => [s.source, s.scope, s.region])).toEqual([
      ["psd", "national", "South Africa"],
      ["harveststat", "provincial", "Western Cape"],
    ])
    expect(r.partialFailures).toEqual([])
  })

  it("reports a failing source and keeps the other", async () => {
    const d = deps({ fetchPsd: vi.fn(() => Promise.reject(new Error("Upstream error 500"))) })
    const r = await resolveBenchmarks(
      input({ psdCommodityCode: "0410000", harvestStatProduct: "Wheat" }),
      d,
    )
    if (r.status !== "available") throw new Error("expected available")
    expect(r.sources).toHaveLength(1)
    expect(r.partialFailures).toEqual([{ source: "psd", reason: "Upstream error 500" }])
  })

  it("is unavailable when every source is empty", async () => {
    const d = deps({ provinceYield: vi.fn(() => []) })
    const r = await resolveBenchmarks(input({ harvestStatProduct: "Lupins" }), d)
    expect(r).toEqual({
      status: "unavailable",
      reason: "No benchmark data: harveststat (No yield rows in range)",
    })
  })
})

describe("syncBenchmarks", () => {
  it("writes one deterministic document per source", async () => {
    const writer = {
      createOrReplace: vi.fn<BenchmarkWriter["createOrReplace"]>(async () => undefined),
    }
    const r = await resolveBenchmarks(input({ harvestStatProduct: "Wheat" }), deps())
    expect(await syncBenchmarks(writer, "crop1", r)).toBe(1)
    const doc = writer.createOrReplace.mock.calls[0]?.[0] as ReturnType<typeof benchmarkDoc>
    expect(doc._id).toBe("benchmark-crop1-harveststat")
    expect(doc.crop._ref).toBe("crop1")
    expect(doc.unit).toBe("kg/ha")
    expect(doc.observations[0]).toMatchObject({ year: 2024, value: 3821.8 })
  })

  it("writes nothing when unavailable", async () => {
    const writer = {
      createOrReplace: vi.fn<BenchmarkWriter["createOrReplace"]>(async () => undefined),
    }
    expect(await syncBenchmarks(writer, "c", { status: "unavailable", reason: "x" })).toBe(0)
    expect(writer.createOrReplace).not.toHaveBeenCalled()
  })
})
