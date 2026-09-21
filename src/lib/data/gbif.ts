import { z } from "zod"
import { haversineKm } from "@/lib/geo/distance"
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

const KM_PER_DEGREE = 111.32

// Georeferenced occurrence records within radiusKm of a point. GBIF's geoDistance filter times out
// for common species (diamondback moth takes 40 s or more), so the query uses a bounding box, which
// answers in about a second, and the records are then trimmed to the true circle.
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
  const dLat = radiusKm / KM_PER_DEGREE
  const dLng = radiusKm / (KM_PER_DEGREE * Math.cos((centre.lat * Math.PI) / 180))
  const range = (mid: number, d: number) => `${(mid - d).toFixed(4)},${(mid + d).toFixed(4)}`
  const url =
    `${HOST}?${taxon}&hasCoordinate=true&hasGeospatialIssue=false` +
    `&decimalLatitude=${range(centre.lat, dLat)}&decimalLongitude=${range(centre.lng, dLng)}` +
    `&limit=${limit}`
  const { results } = await fetchJson(url, schema)
  return results.filter(
    (r) =>
      r.decimalLatitude !== undefined &&
      r.decimalLongitude !== undefined &&
      haversineKm(centre, { lat: r.decimalLatitude, lng: r.decimalLongitude }) <= radiusKm,
  )
}
