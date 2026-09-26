import { z } from "zod"

import { createRateLimiter } from "../../../src/lib/rateLimit"
import { safeEqual } from "../../_lib/crypto"
import { parseEnv } from "../../_lib/env"
import { clientIp, errorResponse, json, readJsonBody, sameOrigin } from "../../_lib/http"
import { createSessionToken, sessionCookie } from "../../_lib/session"

const allow = createRateLimiter(10, 60_000)
const bodySchema = z.object({
  user: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
})

export const onRequestPost: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  if (!sameOrigin(request)) return errorResponse(403, "Cross-origin request rejected")
  const ip = clientIp(request)
  if (!ip) return errorResponse(400, "Missing client address")
  if (!allow(ip)) return errorResponse(429, "Too many attempts, try again in a minute")

  const raw = await readJsonBody(request)
  if (!raw.ok) return raw.response
  const body = bodySchema.safeParse(raw.value)
  if (!body.success) return errorResponse(400, "Expected { user, password }")

  // Evaluate both comparisons so the response time does not reveal which one failed.
  const [userOk, passOk] = await Promise.all([
    safeEqual(body.data.user, env.DEMO_USER),
    safeEqual(body.data.password, env.DEMO_PASSWORD),
  ])
  if (!userOk || !passOk) return errorResponse(401, "Wrong username or password")

  const token = await createSessionToken(env.SESSION_SECRET, env.DEMO_USER)
  return json({ user: env.DEMO_USER }, 200, { "set-cookie": sessionCookie(token) })
}
