import "server-only"
import { z } from "zod"

const schema = z.object({
  NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_SANITY_DATASET: z.string().min(1),
  SANITY_API_WRITE_TOKEN: z.string().min(1),
  SANITY_WEBHOOK_SECRET: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  AUTH_DEMO_USER: z.string().min(1),
  AUTH_DEMO_PASSWORD_HASH: z.string().regex(/^\$2[aby]\$\d{2}\$.{53}$/, "must be a bcrypt hash"),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ")
  throw new Error(`Invalid or missing environment variables: ${missing}`)
}

export const env = parsed.data
