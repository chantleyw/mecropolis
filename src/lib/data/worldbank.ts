import { z } from "zod"
import { fetchJson } from "@/lib/http/fetchJson"

const schema = z.tuple([
  z.unknown(),
  z.array(z.object({ date: z.string(), value: z.number().nullable() })),
])

// Cereal yield (kg/ha) by year, from the World Bank indicator AG.YLD.CREL.KG.
export async function fetchCerealYield(iso3: string, fromYear: number, toYear: number) {
  const url =
    `https://api.worldbank.org/v2/country/${encodeURIComponent(iso3)}/indicator/AG.YLD.CREL.KG` +
    `?format=json&date=${fromYear}:${toYear}`
  const [, rows] = await fetchJson(url, schema)
  return rows
    .filter((r): r is { date: string; value: number } => r.value !== null)
    .map((r) => ({ year: Number(r.date), kgPerHa: r.value }))
    .sort((a, b) => a.year - b.year)
}
