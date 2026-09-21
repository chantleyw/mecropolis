import { NextResponse } from "next/server"
import { writeClient } from "@/lib/sanity/writeClient"
import { authorize, createSchema, failure, readJson } from "@/lib/recommendations/http"

export async function POST(request: Request) {
  const authz = await authorize()
  if ("response" in authz) return authz.response
  const read = await readJson(request)
  if ("response" in read) return read.response
  const parsed = createSchema.safeParse(read.body)
  if (!parsed.success) {
    return failure(400, "Invalid body", parsed.error.issues.map((i) => i.message).join("; "))
  }
  const input = parsed.data

  let fieldId: string | null
  try {
    fieldId = await writeClient.fetch<string | null>(
      `*[_type == "season" && _id == $id][0].field._ref`,
      { id: input.seasonId },
    )
  } catch (e) {
    return failure(502, "Sanity read failed", e instanceof Error ? e.message : "Sanity read failed")
  }
  if (!fieldId) return failure(404, "Not found", "Season not found")

  const now = new Date().toISOString()
  try {
    const doc = await writeClient.create({
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
      createdAt: now,
      createdBy: authz.user,
      ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
    })
    return NextResponse.json({ success: true, id: doc._id, status: "proposed" }, { status: 201 })
  } catch (e) {
    return failure(
      502,
      "Sanity write failed",
      e instanceof Error ? e.message : "Sanity write failed",
    )
  }
}
