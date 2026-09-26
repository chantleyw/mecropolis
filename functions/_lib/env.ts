import { z } from "zod"

// Bindings Cloudflare passes to every Function as `context.env`. Public ids come from
// wrangler.toml [vars]; the rest are secrets.
const schema = z.object({
  SANITY_PROJECT_ID: z.string().min(1),
  SANITY_DATASET: z.string().min(1),
  SANITY_API_WRITE_TOKEN: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  DEMO_USER: z.string().min(1),
  DEMO_PASSWORD: z.string().min(1),
  // Bearer token for a scheduler calling /api/advance. Unset disables the bearer path.
  CRON_SECRET: z.string().min(32).optional(),
})

export type Env = z.infer<typeof schema>

export function parseEnv(raw: unknown): Env {
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ")
    throw new Error(`Invalid Function environment: ${missing}`)
  }
  return parsed.data
}
