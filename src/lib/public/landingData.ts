import "server-only"
import { unstable_cache } from "next/cache"
import { fetchPestOccurrences } from "@/lib/data/gbif"
import { harvestStatMeta, provinceYield } from "@/lib/data/harveststat"
import { fetchPsdYield } from "@/lib/data/psd"
import { fetchSoilTexture } from "@/lib/data/soilgrids"
import { fetchWorldBankYield } from "@/lib/data/worldbank"
import { env } from "@/lib/env"
import { CANOLA_PEST, WHEAT_PEST } from "@/lib/pests/watch"
import { fetchForecast } from "@/lib/weather/openmeteo"

// The one public location: the demo farm's region, the same point the seed script uses.
export const DEMO_SITE = { lat: -33.45, lng: 18.75, label: "Swartland, Western Cape" }

const REVALIDATE_SECONDS = 1800
const PEST_RADIUS_KM = 100
const PEST_LIMIT = 200

export type Live<T> = { ok: true; data: T; fetchedAt: string } | { ok: false }

// Cached loaders throw on failure so an error is never stored; `live` turns the throw into a
// result after the cache, and the detail stays in the server log rather than reaching the page.
async function live<T>(
  name: string,
  load: () => Promise<{ data: T; fetchedAt: string }>,
): Promise<Live<T>> {
  try {
    return { ok: true, ...(await load()) }
  } catch (e) {
    process.stderr.write(`landing data "${name}" failed: ${e instanceof Error ? e.message : e}\n`)
    return { ok: false }
  }
}

// Stamps the retrieval time inside the cache, so it is when the data was fetched, not rendered.
const stamped =
  <T>(load: () => Promise<T>) =>
  async () => ({ data: await load(), fetchedAt: new Date().toISOString() })

export interface WeatherData {
  days: { date: string; max: number | null; min: number | null; rain: number | null }[]
}

const cachedWeather = unstable_cache(
  stamped(async (): Promise<WeatherData> => {
    const s = await fetchForecast(DEMO_SITE.lat, DEMO_SITE.lng, 14)
    return {
      days: s.daily.time.map((date, i) => ({
        date,
        max: s.daily.tempMax[i] ?? null,
        min: s.daily.tempMin[i] ?? null,
        rain: s.daily.precipitation[i] ?? null,
      })),
    }
  }),
  ["landing-weather"],
  { revalidate: REVALIDATE_SECONDS },
)

export type SoilData = Awaited<ReturnType<typeof fetchSoilTexture>>

const cachedSoil = unstable_cache(
  stamped(() => fetchSoilTexture(DEMO_SITE.lat, DEMO_SITE.lng)),
  ["landing-soil"],
  { revalidate: REVALIDATE_SECONDS },
)

export interface PestSummary {
  pest: string
  crop: string
  records: number
  capped: boolean
  latest: string | null
}

const cachedPests = unstable_cache(
  stamped(async (): Promise<PestSummary[]> =>
    Promise.all(
      [
        { ...WHEAT_PEST, crop: "Wheat" },
        { ...CANOLA_PEST, crop: "Canola" },
      ].map(async (p) => {
        const results = await fetchPestOccurrences(
          { taxonKey: p.gbifTaxonKey },
          DEMO_SITE,
          PEST_RADIUS_KM,
          PEST_LIMIT,
        )
        const dates = results.flatMap((r) => (r.eventDate ? [r.eventDate.slice(0, 10)] : []))
        return {
          pest: p.pest,
          crop: p.crop,
          records: results.length,
          capped: results.length >= PEST_LIMIT,
          latest: dates.sort().at(-1) ?? null,
        }
      }),
    ),
  ),
  ["landing-pests"],
  { revalidate: REVALIDATE_SECONDS },
)

export interface YieldSeries {
  source: string
  scope: string
  unit: string
  points: { year: number; kgPerHa: number }[]
}

const yearWindow = () => {
  const to = new Date().getUTCFullYear()
  return { from: to - 9, to }
}

const cachedWorldBank = unstable_cache(
  stamped(async (): Promise<YieldSeries> => {
    const { from, to } = yearWindow()
    const rows = await fetchWorldBankYield("ZAF", "AG.YLD.CREL.KG", from, to)
    if (rows.length === 0) throw new Error("World Bank returned no rows")
    return {
      source: "World Bank",
      scope: "South Africa, all cereals",
      unit: "kg/ha",
      points: rows,
    }
  }),
  ["landing-worldbank"],
  { revalidate: REVALIDATE_SECONDS },
)

const cachedPsd = unstable_cache(
  stamped(async (): Promise<YieldSeries> => {
    const { from, to } = yearWindow()
    const rows = await fetchPsdYield(
      { commodityCode: "0410000", countryCode: "SF", fromYear: from, toYear: to },
      env.FAS_API_KEY,
    )
    if (rows.length === 0) throw new Error("PSD returned no rows")
    return { source: "USDA PSD", scope: "South Africa, wheat", unit: "kg/ha", points: rows }
  }),
  ["landing-psd"],
  { revalidate: REVALIDATE_SECONDS },
)

// Committed extract, no network.
function harvestStatSeries(): YieldSeries | null {
  const { from, to } = yearWindow()
  const points = provinceYield("Western Cape", "Wheat", from, to)
  if (points.length === 0) return null
  return {
    source: "HarvestStat Africa",
    scope: "Western Cape, wheat",
    unit: "kg/ha",
    points: [...points].sort((a, b) => a.year - b.year),
  }
}

export async function loadLanding() {
  const [weather, soil, pests, worldBank, psd] = await Promise.all([
    live("weather", cachedWeather),
    live("soil", cachedSoil),
    live("pests", cachedPests),
    live("worldbank", cachedWorldBank),
    live("psd", cachedPsd),
  ])
  const harvestStat = harvestStatSeries()
  return {
    site: DEMO_SITE,
    radiusKm: PEST_RADIUS_KM,
    weather,
    soil,
    pests,
    yields: [
      psd,
      harvestStat
        ? ({ ok: true, data: harvestStat, fetchedAt: harvestStatMeta.retrievedAt } as const)
        : ({ ok: false } as const),
      worldBank,
    ],
  }
}
