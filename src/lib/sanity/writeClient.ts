import "server-only"
import { createClient } from "@sanity/client"
import { env } from "@/lib/env"

// The only place the write token is used.
export const writeClient = createClient({
  projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2026-01-01",
  token: env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})
