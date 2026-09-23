import { z } from "zod"

import { createRateLimiter } from "../../src/lib/rateLimit"
import { parseEnv } from "../_lib/env"
import { clientIp, errorResponse, getSession, json, readJsonBody, sameOrigin } from "../_lib/http"
import { writeClient } from "../_lib/sanity"

const allow = createRateLimiter(30, 60_000)
// Global cap across all isolates: the in-memory limiter above is per isolate, and Pages has no
// shared rate-limit binding, so Sanity itself is the shared counter. Check-then-create can
// overshoot by the number of concurrent requests; that is acceptable for a demo cap.
const WRITES_PER_HOUR = 60
const bodySchema = z.object({
  fieldId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
  notes: z.string().trim().min(1).max(2000),
})

// Operator-entered field observation. The field must exist; the date is the server's clock.
export const onRequestPost: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  if (!sameOrigin(request)) return errorResponse(403, "Cross-origin request rejected")
  const session = await getSession(request, env)
  if (!session) return errorResponse(401, "Sign in to log observations")
  const ip = clientIp(request)
  if (!ip) return errorResponse(400, "Missing client address")
  if (!allow(ip)) return errorResponse(429, "Too many requests, slow down")

  const raw = await readJsonBody(request)
  if (!raw.ok) return raw.response
  const body = bodySchema.safeParse(raw.value)
  if (!body.success) return errorResponse(400, "Expected { fieldId, notes }")

  const client = writeClient(env)
  const { field, recent } = await client.fetch<{
    field: { _id: string; season: string | null } | null
    recent: number
  }>(
    `{
      "field": *[_type == "field" && _id == $id][0]{
        _id,
        "season": *[_type == "season" && field._ref == ^._id && stage != "review"] | order(year desc)[0]._id
      },
      "recent": count(*[_type == "observation" && dateTime(_createdAt) > dateTime($since)])
    }`,
    { id: body.data.fieldId, since: new Date(Date.now() - 3_600_000).toISOString() },
  )
  if (recent >= WRITES_PER_HOUR) {
    return errorResponse(429, "Observation limit reached for this hour, try again later")
  }
  if (!field) return errorResponse(404, "Unknown field")

  const created = await client.create({
    _type: "observation",
    field: { _type: "reference", _ref: field._id },
    ...(field.season ? { season: { _type: "reference", _ref: field.season } } : {}),
    date: new Date().toISOString(),
    notes: body.data.notes,
    tags: [`entered-by:${session.user}`],
  })
  return json({ _id: created._id }, 201)
}
