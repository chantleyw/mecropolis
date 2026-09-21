import type { PsdParams } from "@/lib/data/psd"
import { WORLD_BANK_INDICATORS, worldBankUrl } from "@/lib/data/worldbank"

export interface YieldObservation {
  year: number
  kgPerHa: number
}

export interface BenchmarkSource {
  source: "psd" | "harveststat" | "worldbank"
  scope: "national" | "provincial"
  region: string
  commodity: string
  observations: YieldObservation[]
  sourceUrl: string
  licence: string
  retrievedAt: string
}

export interface CropBenchmarkConfig {
  psdCommodityCode?: string | null
  harvestStatProduct?: string | null
  worldBankIndicator?: string | null
  unavailableReason?: string | null
}

export interface ResolveInput {
  benchmarks: CropBenchmarkConfig
  commodity: string
  psdCountryCode: string
  iso3: string
  country: string
  province: string
  fromYear: number
  toYear: number
}

export interface ResolveDeps {
  fetchPsd: (params: PsdParams) => Promise<YieldObservation[]>
  provinceYield: (
    province: string,
    product: string,
    fromYear: number,
    toYear: number,
  ) => YieldObservation[]
  fetchWorldBank: (
    iso3: string,
    indicator: string,
    fromYear: number,
    toYear: number,
  ) => Promise<YieldObservation[]>
  harvestStatMeta: { sourceUrl: string; licence: string; retrievedAt: string }
  today: () => string
}

export type Resolution =
  | {
      status: "available"
      sources: BenchmarkSource[]
      partialFailures: { source: string; reason: string }[]
    }
  | { status: "unavailable"; reason: string }

const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

// Collects the regional yield series configured on a crop. Never fetches when the crop declares
// itself unavailable. A failing source is reported, not hidden; when no configured source returns
// data the whole result is unavailable.
export async function resolveBenchmarks(
  input: ResolveInput,
  deps: ResolveDeps,
): Promise<Resolution> {
  const { benchmarks, fromYear, toYear } = input
  if (benchmarks.unavailableReason) {
    return { status: "unavailable", reason: benchmarks.unavailableReason }
  }
  if (
    !benchmarks.psdCommodityCode &&
    !benchmarks.harvestStatProduct &&
    !benchmarks.worldBankIndicator
  ) {
    return { status: "unavailable", reason: "No supported benchmark source configured" }
  }

  const sources: BenchmarkSource[] = []
  const partialFailures: { source: string; reason: string }[] = []

  if (benchmarks.psdCommodityCode) {
    try {
      const observations = await deps.fetchPsd({
        commodityCode: benchmarks.psdCommodityCode,
        countryCode: input.psdCountryCode,
        fromYear,
        toYear,
      })
      if (observations.length === 0) {
        partialFailures.push({ source: "psd", reason: "No yield rows in range" })
      } else {
        sources.push({
          source: "psd",
          scope: "national",
          region: input.country,
          commodity: input.commodity,
          observations,
          sourceUrl: `https://api.fas.usda.gov/api/psd/commodity/${benchmarks.psdCommodityCode}/country/${input.psdCountryCode}`,
          licence: "USDA FAS PSD, public data",
          retrievedAt: deps.today(),
        })
      }
    } catch (e) {
      partialFailures.push({ source: "psd", reason: message(e) })
    }
  }

  if (benchmarks.harvestStatProduct) {
    const observations = deps.provinceYield(
      input.province,
      benchmarks.harvestStatProduct,
      fromYear,
      toYear,
    )
    if (observations.length === 0) {
      partialFailures.push({ source: "harveststat", reason: "No yield rows in range" })
    } else {
      sources.push({
        source: "harveststat",
        scope: "provincial",
        region: input.province,
        commodity: input.commodity,
        observations,
        sourceUrl: deps.harvestStatMeta.sourceUrl,
        licence: deps.harvestStatMeta.licence,
        retrievedAt: deps.harvestStatMeta.retrievedAt,
      })
    }
  }

  if (benchmarks.worldBankIndicator) {
    const indicator = benchmarks.worldBankIndicator
    try {
      const observations = await deps.fetchWorldBank(input.iso3, indicator, fromYear, toYear)
      if (observations.length === 0) {
        partialFailures.push({ source: "worldbank", reason: "No yield rows in range" })
      } else {
        sources.push({
          source: "worldbank",
          scope: "national",
          region: input.country,
          commodity: WORLD_BANK_INDICATORS[indicator] ?? indicator,
          observations,
          sourceUrl: worldBankUrl(input.iso3, indicator, fromYear, toYear),
          licence: "World Bank Open Data, CC BY 4.0",
          retrievedAt: deps.today(),
        })
      }
    } catch (e) {
      partialFailures.push({ source: "worldbank", reason: message(e) })
    }
  }

  if (sources.length === 0) {
    const detail = partialFailures.map((f) => `${f.source} (${f.reason})`).join("; ")
    return { status: "unavailable", reason: `No benchmark data: ${detail}` }
  }
  return { status: "available", sources, partialFailures }
}
