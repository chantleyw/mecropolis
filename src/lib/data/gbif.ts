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

export async function fetchPestOccurrences(scientificName: string, country: string, limit = 20) {
  const url =
    `${HOST}?scientificName=${encodeURIComponent(scientificName)}` +
    `&country=${encodeURIComponent(country)}&hasCoordinate=true&limit=${limit}`
  return fetchJson(url, schema)
}
