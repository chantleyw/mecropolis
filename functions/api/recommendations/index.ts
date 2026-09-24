import { z } from "zod"

import { RECOMMENDATION_TYPES } from "../../../src/lib/recommendations/types"
import { createRateLimiter } from "../../../src/lib/rateLimit"
import { parseEnv } from "../../_lib/env"
import { docId, errorResponse, guard, issues, json, readJsonBody } from "../../_lib/http"
import { writeClient } from "../../_lib/sanity"

const allow = createRateLimiter(30, 60_000)
// Global cap counted in Sanity: the per-isolate IP limiter alone does not bound total writes.
const WRITES_PER_HOUR = 60

const createSchema = z.object({
  seasonId: docId,
  type: z.enum(RECOMMENDATION_TYPES),
  rationale: z.string().trim().min(1).max(4000),
  evidence: z
    .array(
      z.object({
        kind: z.string().min(1).max(40),
        label: z.string().min(1).max(300),
        ref: z.string().max(500).optional(),
        detail: z.string().max(2000).optional(),
      }),
    )
    .max(30)
    .default([]),
  expiresAt: z.iso.datetime().optional(),
})

// Proposes a recommendation for a season; review happens through /api/recommendations/:id/:action.
export const onRequestPost: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  const authz = await guard(request, env, allow, { write: true })
  if (!authz.ok) return authz.response
  const raw = await readJsonBody(request, 64 * 1024)
  if (!raw.ok) return raw.response
  const parsed = createSchema.safeParse(raw.value)
  if (!parsed.success) return errorResponse(400, issues(parsed.error))
  const input = parsed.data

  const client = writeClient(env)
  const { fieldId, recent } = await client.fetch<{ fieldId: string | null; recent: number }>(
    `{
      "fieldId": *[_type == "season" && _id == $id][0].field._ref,
      "recent": count(*[_type == "agronomyRecommendation" && dateTime(_createdAt) > dateTime($since)])
    }`,
    { id: input.seasonId, since: new Date(Date.now() - 3_600_000).toISOString() },
  )
  if (recent >= WRITES_PER_HOUR) {
    return errorResponse(429, "Recommendation limit reached for this hour, try again later")
  }
  if (!fieldId) return errorResponse(404, "Season not found")

  const doc = await client.create({
    _type: "agronomyRecommendation",
    season: { _type: "reference", _ref: input.seasonId },
    field: { _type: "reference", _ref: fieldId },
    type: input.type,
    status: "proposed",
    rationale: input.rationale,
    evidence: input.evidence.map((e) => ({
      _key: crypto.randomUUID(),
      _type: "evidenceItem",
      ...e,
    })),
    createdAt: new Date().toISOString(),
    createdBy: authz.user,
    ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
  })
  return json({ id: doc._id, status: "proposed" }, 201)
}
