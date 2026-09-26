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

// Public-read dataset: reads that need no token and may be served from the CDN.
export function readClient(env: Env): SanityClient {
  return createClient({
    projectId: env.SANITY_PROJECT_ID,
    dataset: env.SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    useCdn: true,
  })
}

// Sanity rejects a mutation whose ifRevisionID no longer matches with 409.
export function isRevisionConflict(e: unknown): boolean {
  return typeof e === "object" && e !== null && "statusCode" in e && e.statusCode === 409
}

// The Actions API answers 404 when the draft to publish no longer exists.
export function isNotFound(e: unknown): boolean {
  return typeof e === "object" && e !== null && "statusCode" in e && e.statusCode === 404
}
