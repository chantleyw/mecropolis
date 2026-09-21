import "server-only"
import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { createRateLimiter } from "@/lib/rateLimit"
import { writeClient } from "@/lib/sanity/writeClient"
import { RECOMMENDATION_TYPES } from "./types"
import { checkTransition, isStatus, type RecommendationStatus } from "./machine"

const allow = createRateLimiter(30, 60_000)

export const failure = (status: number, error: string, reason: string) =>
  NextResponse.json({ success: false, error, reason }, { status })

/** Session check and rate limit shared by every recommendation route. Returns the display name. */
export async function authorize(): Promise<{ user: string } | { response: NextResponse }> {
  const user = (await auth())?.user?.name
  if (!user) return { response: failure(401, "Unauthorized", "Sign in required") }
  if (!allow(user)) {
    return {
      response: failure(429, "Too many requests", "Rate limit exceeded; try again shortly"),
    }
  }
  return { user }
}

export async function readJson(
  request: Request,
): Promise<{ body: unknown } | { response: NextResponse }> {
  const text = await request.text()
  if (!text.trim()) return { body: {} }
  try {
    return { body: JSON.parse(text) }
  } catch {
    return { response: failure(400, "Invalid body", "Body must be JSON") }
  }
}

export const createSchema = z.object({
  seasonId: z.string().min(1).max(200),
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

const transitionSchema = z.object({ decisionNote: z.string().trim().max(2000).optional() })

const errorMessage = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)

function isRevisionConflict(e: unknown): boolean {
  return typeof e === "object" && e !== null && "statusCode" in e && e.statusCode === 409
}

interface Row {
  _rev: string
  status: string
}

/** Moves one recommendation to `to`; the revision check makes a concurrent change fail. */
export async function transition(request: Request, id: string, to: RecommendationStatus) {
  const authz = await authorize()
  if ("response" in authz) return authz.response
  const read = await readJson(request)
  if ("response" in read) return read.response
  const parsed = transitionSchema.safeParse(read.body)
  if (!parsed.success) {
    return failure(400, "Invalid body", parsed.error.issues.map((i) => i.message).join("; "))
  }

  let row: Row | null
  try {
    row = await writeClient.fetch<Row | null>(
      `*[_type == "agronomyRecommendation" && _id == $id][0]{_rev, status}`,
      { id },
    )
  } catch (e) {
    return failure(502, "Sanity read failed", errorMessage(e, "Sanity read failed"))
  }
  if (!row) return failure(404, "Not found", "Recommendation not found")
  if (!isStatus(row.status)) {
    return failure(409, "Invalid state", `Unknown status "${row.status}"`)
  }

  const check = checkTransition(row.status, to)
  if (!check.valid) return failure(409, "Invalid transition", check.reason)

  const now = new Date().toISOString()
  try {
    await writeClient
      .transaction()
      .patch(id, (p) =>
        p.ifRevisionId(row._rev).set({
          status: to,
          reviewedAt: now,
          reviewedBy: authz.user,
          ...(parsed.data.decisionNote ? { decisionNote: parsed.data.decisionNote } : {}),
        }),
      )
      .commit()
  } catch (e) {
    if (isRevisionConflict(e)) {
      return failure(409, "Conflict", "Recommendation changed; reload and retry")
    }
    return failure(502, "Sanity write failed", errorMessage(e, "Sanity write failed"))
  }
  return NextResponse.json({ success: true, id, status: to })
}
