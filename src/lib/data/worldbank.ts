import { z } from "zod"
import { fetchJson } from "@/lib/http/fetchJson"

const schema = z.tuple([
  z.unknown(),
  z.array(z.object({ date: z.string(), value: z.number().nullable() })),
])

// Indicators this build understands, with the label shown for the series. The World Bank series
// is national and covers a crop group, not a single crop.
export const WORLD_BANK_INDICATORS: Record<string, string> = {
  "AG.YLD.CREL.KG": "All cereals (World Bank cereal yield)",
}

export function worldBankUrl(iso3: string, indicator: string, fromYear: number, toYear: number) {
  return (
    `https://api.worldbank.org/v2/country/${encodeURIComponent(iso3)}/indicator/${encodeURIComponent(indicator)}` +
    `?format=json&date=${fromYear}:${toYear}`
  )
}

// National yield (kg/ha) by year for a World Bank indicator. Years with no value are omitted.
export async function fetchWorldBankYield(
  iso3: string,
  indicator: string,
  fromYear: number,
  toYear: number,
) {
  if (!(indicator in WORLD_BANK_INDICATORS)) {
    throw new Error(`Unsupported World Bank indicator: ${indicator}`)
  }
  const [, rows] = await fetchJson(worldBankUrl(iso3, indicator, fromYear, toYear), schema)
  return rows
    .filter((r): r is { date: string; value: number } => r.value !== null)
    .map((r) => ({ year: Number(r.date), kgPerHa: r.value }))
    .sort((a, b) => a.year - b.year)
}
