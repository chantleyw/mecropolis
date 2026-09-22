import { z } from "zod"

// VITE_* values are inlined at build time by Vite's `import.meta.env` and must be read as
// literal property accesses.
const schema = z.object({
  projectId: z.string().min(1),
  dataset: z.string().min(1),
})

const parsed = schema.safeParse({
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID,
  dataset: import.meta.env.VITE_SANITY_DATASET,
})

if (!parsed.success) {
  throw new Error("Missing VITE_SANITY_PROJECT_ID or VITE_SANITY_DATASET")
}

export const publicEnv = parsed.data
