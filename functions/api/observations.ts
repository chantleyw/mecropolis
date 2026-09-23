import { z } from "zod"

import { createRateLimiter } from "../../src/lib/rateLimit"
import { parseEnv } from "../_lib/env"
import { clientIp, errorResponse, getSession, json, sameOrigin } from "../_lib/http"
import { writeClient } from "../_lib/sanity"

const allow = createRateLimiter(30, 60_000)
const bodySchema = z.object({
  fieldId: z.string().regex(/^[A-Za-z0-9._-]{1,128}$/),
  notes: z.string().trim().min(1).max(2000),
})

// Operator-entered field observation. The field must exist; the date is the server's clock.
export const onRequestPost: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  if (!sameOrigin(request)) return errorResponse(403, "Cross-origin request rejected")
  const session = await getSession(request, env)
  if (!session) return errorResponse(401, "Sign in to log observations")
  if (!allow(clientIp(request))) return errorResponse(429, "Too many requests, slow down")

  const body = bodySchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return errorResponse(400, "Expected { fieldId, notes }")

  const client = writeClient(env)
  const field = await client.fetch<{ _id: string; season: string | null } | null>(
    `*[_type == "field" && _id == $id][0]{
      _id,
      "season": *[_type == "season" && field._ref == ^._id && stage != "review"] | order(year desc)[0]._id
    }`,
    { id: body.data.fieldId },
  )
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
