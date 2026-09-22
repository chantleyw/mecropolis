import "server-only"
import { createClient } from "next-sanity"

import { env } from "@/lib/env"
import { publicEnv } from "@/lib/publicEnv"

// The dataset requires a token for any read (confirmed by testing: an anonymous client
// returns zero documents, not an error). This token is Viewer-scoped, read-only, and never
// reaches the browser — keep this module server-only.
export const readClient = createClient({
  projectId: publicEnv.projectId,
  dataset: publicEnv.dataset,
  apiVersion: "2026-01-01",
  token: env.SANITY_API_READ_TOKEN,
  useCdn: true,
  perspective: "published",
})
