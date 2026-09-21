import { z } from "zod"

// NEXT_PUBLIC_* values are inlined at build time and must be read as literal
// property accesses, so they cannot come from the server-only env.ts.
const schema = z.object({
  projectId: z.string().min(1),
  dataset: z.string().min(1),
})

const parsed = schema.safeParse({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
})

if (!parsed.success) {
  throw new Error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID or NEXT_PUBLIC_SANITY_DATASET")
}

export const publicEnv = parsed.data
