import { z } from "zod"

import { proposalSchema } from "../../../src/lib/recommendations/proposal"
import { createRateLimiter } from "../../../src/lib/rateLimit"
import { parseEnv } from "../../_lib/env"
import { errorResponse, guard, issues, json, readJsonBody } from "../../_lib/http"
import { writeClient } from "../../_lib/sanity"

const allow = createRateLimiter(30, 60_000)
// Global cap counted in Sanity: the per-isolate IP limiter alone does not bound total writes.
const WRITES_PER_HOUR = 60

const slug = z.string().regex(/^[a-z0-9-]{1,96}$/, "invalid farm slug")

// Proposed recommendations are drafts, which anonymous reads cannot see, so the review queue
// reads them here with the token. Same shape as loadRecommendations in src/lib/sanity/queries.ts.
// The drafts perspective also returns a published doc still marked proposed (an approve whose
// status patch failed), so it can be reviewed again.
export const onRequestGet: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  const authz = await guard(request, env, allow, { write: false })
  if (!authz.ok) return authz.response
  const farm = slug.safeParse(new URL(request.url).searchParams.get("farm"))
  if (!farm.success) return errorResponse(400, "Expected ?farm=<farm slug>")

  const entries = await writeClient(env).fetch<unknown[]>(
    `*[_type == "agronomyRecommendation" && status == "proposed" && field->farm->slug.current == $slug]
      | order(createdAt desc)[0...30]{
      _id, type, status, rationale, createdAt, createdBy, reviewedAt, reviewedBy, decisionNote,
      "seasonId": season._ref,
      "seasonLabel": season->crop->name + " " + string(season->year),
      "fieldName": field->name,
      "evidence": coalesce(evidence[]{kind, label, ref, detail}, [])
    }`,
    { slug: farm.data },
    { perspective: "drafts" },
  )
  return json({ entries })
}

// Proposes a recommendation for a season as a draft through the Actions API; review publishes
// it through /api/recommendations/:id/:action.
export const onRequestPost: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  const authz = await guard(request, env, allow, { write: true })
  if (!authz.ok) return authz.response
  const raw = await readJsonBody(request, 64 * 1024)
  if (!raw.ok) return raw.response
  const parsed = proposalSchema.safeParse(raw.value)
  if (!parsed.success) return errorResponse(400, issues(parsed.error))
  const input = parsed.data

  const client = writeClient(env)
  const { fieldId, recent } = await client.fetch<{ fieldId: string | null; recent: number }>(
    `{
      "fieldId": *[_type == "season" && _id == $id][0].field._ref,
      "recent": count(*[_type == "agronomyRecommendation" && dateTime(_createdAt) > dateTime($since)])
    }`,
    { id: input.seasonId, since: new Date(Date.now() - 3_600_000).toISOString() },
    // Raw so drafts count towards the cap.
    { perspective: "raw" },
  )
  if (recent >= WRITES_PER_HOUR) {
    return errorResponse(429, "Recommendation limit reached for this hour, try again later")
  }
  if (!fieldId) return errorResponse(404, "Season not found")

  const id = crypto.randomUUID()
  await client.action({
    actionType: "sanity.action.document.create",
    publishedId: id,
    ifExists: "fail",
    attributes: {
      _id: `drafts.${id}`,
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
    },
  })
  return json({ id, status: "proposed" }, 201)
}
