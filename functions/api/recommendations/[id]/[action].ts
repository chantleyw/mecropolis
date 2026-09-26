import { z } from "zod"

import {
  checkTransition,
  isStatus,
  type RecommendationStatus,
} from "../../../../src/lib/recommendations/machine"
import { createRateLimiter } from "../../../../src/lib/rateLimit"
import { parseEnv } from "../../../_lib/env"
import { docId, errorResponse, guard, issues, json, readJsonBody } from "../../../_lib/http"
import { isNotFound, isRevisionConflict, writeClient } from "../../../_lib/sanity"

const allow = createRateLimiter(30, 60_000)

const TARGET: Record<string, RecommendationStatus> = {
  approve: "approved",
  reject: "rejected",
  complete: "completed",
}

const bodySchema = z.object({ decisionNote: z.string().trim().max(2000).optional() })

// Moves one recommendation through the state machine. Approve and reject publish the draft, so
// the decision stays in the document's history. The revision checks make a concurrent change fail
// with 409 instead of being overwritten.
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
  const draftId = `drafts.${id.data}`
  const rows = await client.fetch<{ _id: string; _rev: string; status: string }[]>(
    `*[_type == "agronomyRecommendation" && _id in [$id, $draftId]]{_id, _rev, status}`,
    { id: id.data, draftId },
    { perspective: "raw" },
  )
  const draft = rows.find((r) => r._id === draftId)
  const published = rows.find((r) => r._id === id.data)
  const current = draft ?? published
  if (!current) return errorResponse(404, "Recommendation not found")
  if (!isStatus(current.status)) return errorResponse(409, `Unknown status "${current.status}"`)
  const check = checkTransition(current.status, to)
  if (!check.valid) return errorResponse(409, check.reason)

  let publishing = false
  try {
    // A proposed recommendation is a draft: publish it (Actions API), then record the decision on
    // the published doc. Its _rev is the publish transaction id, so a change in between is a 409.
    // If the patch fails the doc stays published as proposed and the same action retries it.
    let rev = published?._rev
    if (draft) {
      publishing = true
      const result = await client.action({
        actionType: "sanity.action.document.publish",
        draftId,
        publishedId: id.data,
        ifDraftRevisionId: draft._rev,
        ...(published ? { ifPublishedRevisionId: published._rev } : {}),
      })
      rev = result.transactionId
      publishing = false
    }
    if (!rev) return errorResponse(404, "Recommendation not found")
    await client
      .transaction()
      .patch(id.data, (p) =>
        p.ifRevisionId(rev).set({
          status: to,
          reviewedAt: new Date().toISOString(),
          reviewedBy: authz.user,
          ...(body.data.decisionNote ? { decisionNote: body.data.decisionNote } : {}),
        }),
      )
      .commit()
  } catch (e) {
    // A 404 while publishing means another review published the draft first.
    if (isRevisionConflict(e) || (publishing && isNotFound(e))) {
      return errorResponse(409, "Recommendation changed since you loaded it; reload and retry")
    }
    throw e
  }
  return json({ id: id.data, status: to })
}
