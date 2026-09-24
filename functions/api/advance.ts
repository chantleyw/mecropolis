import { z } from "zod"

import { createRateLimiter } from "../../src/lib/rateLimit"
import { safeEqual } from "../_lib/crypto"
import { parseEnv, type Env } from "../_lib/env"
import {
  clientIp,
  docId,
  errorResponse,
  getSession,
  issues,
  readJsonBody,
  sameOrigin,
} from "../_lib/http"
import { reconcile } from "../_lib/reconcile"

const allow = createRateLimiter(20, 60_000)

const bodySchema = z.object({ seasonId: docId.optional() })

async function isScheduler(request: Request, env: Env): Promise<boolean> {
  const header = request.headers.get("authorization")
  if (!env.CRON_SECRET || !header?.startsWith("Bearer ")) return false
  return safeEqual(header.slice(7), env.CRON_SECRET)
}

// Walks seasons forward from planting date and GDD. A signed-in user (same-origin) reconciles one
// season and must send `seasonId`; a scheduler with `Authorization: Bearer CRON_SECRET` may omit it
// to walk every season. GET is scheduler only.
export const onRequestPost: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  let triggeredBy: string
  if (await isScheduler(request, env)) {
    triggeredBy = "scheduler"
  } else {
    if (!sameOrigin(request)) return errorResponse(403, "Cross-origin request rejected")
    const session = await getSession(request, env)
    if (!session) return errorResponse(401, "Sign in required")
    triggeredBy = session.user
  }
  const key = triggeredBy === "scheduler" ? "scheduler" : clientIp(request)
  if (!key) return errorResponse(400, "Missing client address")
  if (!allow(key)) return errorResponse(429, "Too many requests, slow down")

  const raw = await readJsonBody(request)
  if (!raw.ok) return raw.response
  const parsed = bodySchema.safeParse(raw.value)
  if (!parsed.success) return errorResponse(400, issues(parsed.error))
  if (!parsed.data.seasonId && triggeredBy !== "scheduler") {
    return errorResponse(400, "seasonId is required")
  }
  return reconcile(env, parsed.data.seasonId, triggeredBy)
}

export const onRequestGet: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  if (!(await isScheduler(request, env))) return errorResponse(401, "Bearer token required")
  if (!allow("scheduler")) return errorResponse(429, "Too many requests, slow down")
  return reconcile(env, undefined, "scheduler")
}

