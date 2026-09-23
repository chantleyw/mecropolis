import { createClient, type SanityClient } from "@sanity/client"

import type { Env } from "./env"

export const SANITY_API_VERSION = "2026-01-01"

// Server-side client holding the write token. Only Functions import this; the token never
// reaches the browser bundle.
export function writeClient(env: Env): SanityClient {
  return createClient({
    projectId: env.SANITY_PROJECT_ID,
    dataset: env.SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    token: env.SANITY_API_WRITE_TOKEN,
    useCdn: false,
  })
}
