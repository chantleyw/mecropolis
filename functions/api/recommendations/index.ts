import { z } from "zod"

import { RECOMMENDATION_TYPES } from "../../../src/lib/recommendations/types"
import { createRateLimiter } from "../../../src/lib/rateLimit"
import { parseEnv } from "../../_lib/env"
import { docId, errorResponse, guard, issues, json, readJsonBody } from "../../_lib/http"
import { writeClient } from "../../_lib/sanity"

const allow = createRateLimiter(30, 60_000)

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
  const fieldId = await client.fetch<string | null>(
    `*[_type == "season" && _id == $id][0].field._ref`,
    { id: input.seasonId },
  )
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
