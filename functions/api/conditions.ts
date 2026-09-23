import { createClient } from "@sanity/client"

import { loadSiteConditions } from "../../src/lib/public/landingData"
import { parseEnv } from "../_lib/env"
import { errorResponse, getSession, json } from "../_lib/http"
import { SANITY_API_VERSION } from "../_lib/sanity"

const SLUG = /^[a-z0-9-]{1,96}$/

// Weather, soil and pest summary for one farm. Takes a farm slug, not coordinates, so callers can
// only reach locations stored in Sanity and the per-isolate cache stays bounded by the farm count.
export const onRequestGet: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  if (!(await getSession(request, env)))
    return errorResponse(401, "Sign in to view farm conditions")

  const slug = new URL(request.url).searchParams.get("farm") ?? ""
  if (!SLUG.test(slug)) return errorResponse(400, "Expected ?farm=<slug>")

  // Public dataset: read without the token.
  const farm = await createClient({
    projectId: env.SANITY_PROJECT_ID,
    dataset: env.SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    useCdn: true,
  }).fetch<{ location: string | null; lat: number | null; lng: number | null } | null>(
    `*[_type == "farm" && slug.current == $slug][0]{ location, "lat": coordinates.lat, "lng": coordinates.lng }`,
    { slug },
  )
  if (!farm) return errorResponse(404, "Farm not found")
  if (farm.lat == null || farm.lng == null) return errorResponse(422, "Farm coordinates not set")

  const data = await loadSiteConditions({
    lat: farm.lat,
    lng: farm.lng,
    label: farm.location ?? "Farm location",
  })
  return json(data)
}
