import { z } from "zod"

import {
  checkTransition,
  isStatus,
  type RecommendationStatus,
} from "../../../../src/lib/recommendations/machine"
import { createRateLimiter } from "../../../../src/lib/rateLimit"
import { parseEnv } from "../../../_lib/env"
import { docId, errorResponse, guard, issues, json, readJsonBody } from "../../../_lib/http"
import { isRevisionConflict, writeClient } from "../../../_lib/sanity"

const allow = createRateLimiter(30, 60_000)

const TARGET: Record<string, RecommendationStatus> = {
  approve: "approved",
  reject: "rejected",
  complete: "completed",
}

const bodySchema = z.object({ decisionNote: z.string().trim().max(2000).optional() })

// Moves one recommendation through the state machine. The revision check makes a concurrent
// change fail with 409 instead of being overwritten.
export const onRequestPost: PagesFunction<unknown, "id" | "action"> = async ({
  request,
  env: rawEnv,
  params,
}) => {
  const env = parseEnv(rawEnv)
  const authz = await guard(request, env, allow, { write: true })
  if (!authz.ok) return authz.response

  const id = docId.safeParse(params.id)
  const to = typeof params.action === "string" ? TARGET[params.action] : undefined
  if (!id.success || !to) return errorResponse(404, "Unknown recommendation action")

  const raw = await readJsonBody(request)
  if (!raw.ok) return raw.response
  const body = bodySchema.safeParse(raw.value)
  if (!body.success) return errorResponse(400, issues(body.error))

  const client = writeClient(env)
  const row = await client.fetch<{ _rev: string; status: string } | null>(
    `*[_type == "agronomyRecommendation" && _id == $id][0]{_rev, status}`,
    { id: id.data },
  )
  if (!row) return errorResponse(404, "Recommendation not found")
  if (!isStatus(row.status)) return errorResponse(409, `Unknown status "${row.status}"`)
  const check = checkTransition(row.status, to)
  if (!check.valid) return errorResponse(409, check.reason)

  try {
    await client
      .transaction()
      .patch(id.data, (p) =>
        p.ifRevisionId(row._rev).set({
          status: to,
          reviewedAt: new Date().toISOString(),
          reviewedBy: authz.user,
          ...(body.data.decisionNote ? { decisionNote: body.data.decisionNote } : {}),
        }),
      )
      .commit()
  } catch (e) {
    if (isRevisionConflict(e)) {
      return errorResponse(409, "Recommendation changed since you loaded it; reload and retry")
    }
    throw e
  }
  return json({ id: id.data, status: to })
}
