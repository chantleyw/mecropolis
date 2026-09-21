import { z } from "zod"
import { toKgPerHa } from "@/lib/benchmark/units"
import { fetchJson } from "@/lib/http/fetchJson"

const HOST = "https://api.fas.usda.gov/api/psd/commodity"

const YIELD_ATTRIBUTE_ID = 184
// PSD unit ids seen on the yield attribute: 26 is MT/HA.
const UNIT_BY_ID: Record<number, string> = { 26: "mt/ha" }

const rowSchema = z.object({
  marketYear: z.string(),
  attributeId: z.number(),
  unitId: z.number(),
  value: z.number().nullable(),
})
const schema = z.array(rowSchema)

export interface PsdParams {
  commodityCode: string
  countryCode: string
  fromYear: number
  toYear: number
}

// National yield (kg/ha) by market year from USDA FAS PSD. The key is an argument so this module
// stays free of env access. Years the API has no yield row for are omitted.
export async function fetchPsdYield(
  { commodityCode, countryCode, fromYear, toYear }: PsdParams,
  apiKey: string,
): Promise<{ year: number; kgPerHa: number }[]> {
  const years = Array.from({ length: Math.max(0, toYear - fromYear + 1) }, (_, i) => fromYear + i)
  const perYear = await Promise.all(
    years.map(async (year) => {
      const url =
        `${HOST}/${encodeURIComponent(commodityCode)}/country/${encodeURIComponent(countryCode)}` +
        `/year/${year}?api_key=${encodeURIComponent(apiKey)}`
      const rows = await fetchJson(url, schema)
      const row = rows.find((r) => r.attributeId === YIELD_ATTRIBUTE_ID)
      if (!row || row.value === null) return null
      const unit = UNIT_BY_ID[row.unitId]
      if (!unit) throw new Error(`Unknown PSD yield unit id: ${row.unitId}`)
      return { year: Number(row.marketYear), kgPerHa: toKgPerHa(row.value, unit) }
    }),
  )
  return perYear.filter((r): r is { year: number; kgPerHa: number } => r !== null)
}
