import { z } from "zod"
import { fetchJson } from "@/lib/http/fetchJson"

const HOST = "https://api.gbif.org/v1/occurrence/search"

const schema = z.object({
  count: z.number(),
  results: z.array(
    z.object({
      key: z.number(),
      eventDate: z.string().optional(),
      decimalLatitude: z.number().optional(),
      decimalLongitude: z.number().optional(),
    }),
  ),
})

export interface PestTarget {
  scientificName?: string
  taxonKey?: number
}

export const occurrenceUrl = (key: number) => `https://www.gbif.org/occurrence/${key}`

// Georeferenced occurrence records within radiusKm of a point.
export async function fetchPestOccurrences(
  target: PestTarget,
  centre: { lat: number; lng: number },
  radiusKm: number,
  limit = 20,
) {
  if (target.taxonKey === undefined && !target.scientificName) {
    throw new Error("A GBIF taxon key or scientific name is required")
  }
  const taxon =
    target.taxonKey !== undefined
      ? `taxonKey=${target.taxonKey}`
      : `scientificName=${encodeURIComponent(target.scientificName ?? "")}`
  const url =
    `${HOST}?${taxon}&hasCoordinate=true&hasGeospatialIssue=false` +
    `&geoDistance=${centre.lat},${centre.lng},${Math.round(radiusKm)}km&limit=${limit}`
  const { results } = await fetchJson(url, schema)
  return results
}
