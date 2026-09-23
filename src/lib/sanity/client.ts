import { createClient } from "@sanity/client"

import { publicEnv } from "../publicEnv"

export const SANITY_API_VERSION = "2026-01-01"

// Browser client: no token. The dataset is public-read, so this sees published documents only;
// drafts and every write go through the Pages Functions under /api.
export const sanity = createClient({
  projectId: publicEnv.projectId,
  dataset: publicEnv.dataset,
  apiVersion: SANITY_API_VERSION,
  useCdn: true,
  perspective: "published",
})

// Uncached reads for refetching right after a live mutation event, when the CDN may lag.
export const sanityFresh = sanity.withConfig({ useCdn: false })
