import { z } from "zod"
import raw from "./harveststat-za.json"

const dataSchema = z.object({
  meta: z.object({
    source: z.string(),
    sourceUrl: z.string(),
    licence: z.string(),
    unit: z.literal("kg/ha"),
    retrievedAt: z.string(),
  }),
  rows: z.array(
    z.object({
      province: z.string(),
      product: z.string(),
      year: z.number(),
      kgPerHa: z.number().positive(),
    }),
  ),
})

// Parsed at import so a malformed extract fails the build rather than a request.
const data = dataSchema.parse(raw)

export const harvestStatMeta = data.meta

// Province-level yield (kg/ha) by harvest year, from the committed South Africa extract.
// Values are converted from mt/ha at extraction time (scripts/extract-harveststat.mjs).
export function provinceYield(
  province: string,
  product: string,
  fromYear: number,
  toYear: number,
): { year: number; kgPerHa: number }[] {
  return data.rows
    .filter(
      (r) =>
        r.province === province && r.product === product && r.year >= fromYear && r.year <= toYear,
    )
    .map(({ year, kgPerHa }) => ({ year, kgPerHa }))
}
