import { z } from "zod"

import { createRateLimiter } from "../../../src/lib/rateLimit"
import { isValidSignature } from "../../../src/lib/webhook/signature"
import { parseEnv } from "../../_lib/env"
import { docId, errorResponse, json, readBytesBody } from "../../_lib/http"
import { reconcile } from "../../_lib/reconcile"

const allow = createRateLimiter(60, 60_000)
const MAX_BYTES = 4 * 1024

// The webhook's projection in manage.sanity.io is {_id, _type, "seasonId": season._ref}.
const payloadSchema = z.object({
  _id: z.string(),
  _type: z.string(),
  seasonId: docId.nullish(),
})

// Sanity GROQ webhook on observation and weatherSnapshot create. Verifies the signature against
// the raw body, then reconciles the document's season. Replaces the dropped cron. Reconcile is
// idempotent, so Sanity's retries are harmless; a conflict (409) or error (502) asks for one.
export const onRequestPost: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  if (!env.SANITY_WEBHOOK_SECRET) return errorResponse(404, "Webhook not configured")

  const body = await readBytesBody(request, MAX_BYTES)
  if (!body.ok) return body.response
  const raw = new TextDecoder().decode(body.value)
  const signature = request.headers.get("sanity-webhook-signature")
  if (!(await isValidSignature(raw, signature, env.SANITY_WEBHOOK_SECRET))) {
    return errorResponse(401, "Invalid signature")
  }
  // Charged only after the signature check, so unsigned junk cannot starve real deliveries.
  if (!allow("webhook")) return errorResponse(429, "Too many requests, slow down")

  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return errorResponse(400, "Malformed JSON")
  }
  const payload = payloadSchema.safeParse(value)
  if (!payload.success) return errorResponse(400, "Expected { _id, _type, seasonId }")
  if (!payload.data.seasonId) return json({ status: "ignored", reason: "No season on document" })

  return reconcile(env, payload.data.seasonId, "webhook")
}
