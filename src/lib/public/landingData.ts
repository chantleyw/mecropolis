import { ttlCache } from "@/lib/cache/ttl"
import { fetchPestOccurrences } from "@/lib/data/gbif"
import { harvestStatMeta, provinceYield } from "@/lib/data/harveststat"
import { fetchPsdYield } from "@/lib/data/psd"
import { fetchSoilTexture } from "@/lib/data/soilgrids"
import { fetchWorldBankYield } from "@/lib/data/worldbank"
import { CANOLA_PEST, WHEAT_PEST } from "@/lib/pests/watch"
import { fetchForecast } from "@/lib/weather/openmeteo"

// The one public location: the demo farm's region, the same point the seed script uses.
export const DEMO_SITE: Site = { lat: -33.45, lng: 18.75, label: "Swartland, Western Cape" }

const TTL_MS = 30 * 60 * 1000
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
  <A extends unknown[], T>(load: (...args: A) => Promise<T>) =>
  async (...args: A) => ({ data: await load(...args), fetchedAt: new Date().toISOString() })

export interface Site {
  lat: number
  lng: number
  label: string
}

export interface WeatherData {
  days: { date: string; max: number | null; min: number | null; rain: number | null }[]
}

const cachedWeather = ttlCache(
  stamped(async (lat: number, lng: number): Promise<WeatherData> => {
    const s = await fetchForecast(lat, lng, 14)
    return {
      days: s.daily.time.map((date, i) => ({
        date,
        max: s.daily.tempMax[i] ?? null,
        min: s.daily.tempMin[i] ?? null,
        rain: s.daily.precipitation[i] ?? null,
      })),
    }
  }),
  TTL_MS,
)

export type SoilData = Awaited<ReturnType<typeof fetchSoilTexture>>

const cachedSoil = ttlCache(
  stamped((lat: number, lng: number) => fetchSoilTexture(lat, lng)),
  TTL_MS,
)

export interface PestSummary {
  pest: string
  crop: string
  records: number
  capped: boolean
  latest: string | null
}

const cachedPests = ttlCache(
  stamped(async (lat: number, lng: number): Promise<PestSummary[]> =>
    Promise.all(
      [
        { ...WHEAT_PEST, crop: "Wheat" },
        { ...CANOLA_PEST, crop: "Canola" },
      ].map(async (p) => {
        const results = await fetchPestOccurrences(
          { taxonKey: p.gbifTaxonKey },
          { lat, lng },
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
  TTL_MS,
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

const cachedWorldBank = ttlCache(
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
  TTL_MS,
)

const cachedPsd = ttlCache(
  stamped(async (fasApiKey: string): Promise<YieldSeries> => {
    const { from, to } = yearWindow()
    const rows = await fetchPsdYield(
      { commodityCode: "0410000", countryCode: "SF", fromYear: from, toYear: to },
      fasApiKey,
    )
    if (rows.length === 0) throw new Error("PSD returned no rows")
    return { source: "USDA PSD", scope: "South Africa, wheat", unit: "kg/ha", points: rows }
  }),
  TTL_MS,
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

// Cache keys are the arguments, so each location is cached separately.
export async function loadSiteConditions(site: Site) {
  const [weather, soil, pests] = await Promise.all([
    live("weather", () => cachedWeather(site.lat, site.lng)),
    live("soil", () => cachedSoil(site.lat, site.lng)),
    live("pests", () => cachedPests(site.lat, site.lng)),
  ])
  return { site, radiusKm: PEST_RADIUS_KM, weather, soil, pests }
}

// The PSD key is a server secret; the caller supplies it (a Pages Function in the SPA).
export async function loadLanding(fasApiKey: string) {
  const [conditions, worldBank, psd] = await Promise.all([
    loadSiteConditions(DEMO_SITE),
    live("worldbank", cachedWorldBank),
    live("psd", () => cachedPsd(fasApiKey)),
  ])
  const harvestStat = harvestStatSeries()
  return {
    ...conditions,
    yields: [
      psd,
      harvestStat
        ? ({ ok: true, data: harvestStat, fetchedAt: harvestStatMeta.retrievedAt } as const)
        : ({ ok: false } as const),
      worldBank,
    ],
  }
}
