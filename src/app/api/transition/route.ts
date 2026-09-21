import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { createRateLimiter } from "@/lib/rateLimit"
import { writeClient } from "@/lib/sanity/writeClient"
import { evaluate } from "@/lib/workflow/guards"
import { STAGES, type SeasonState } from "@/lib/workflow/types"

const bodySchema = z.object({
  seasonId: z.string().min(1).max(200),
  targetStage: z.enum(STAGES),
  notes: z.string().max(1000).optional(),
})

const MIN_DAYS_TO_GROWING = 7
const allow = createRateLimiter(20, 60_000)

const seasonQuery = `*[_type == "season" && _id == $id][0]{
  _id, _rev, stage, plantingDate, actualHarvest, yieldAmount,
  "cropId": crop._ref,
  "treatmentCount": count(*[_type == "treatment" && season._ref == ^._id])
}`

interface SeasonRow {
  _id: string
  _rev: string
  stage: SeasonState["stage"] | null
  plantingDate: string | null
  actualHarvest: string | null
  yieldAmount: number | null
  cropId: string | null
  treatmentCount: number
}

const failure = (status: number, error: string, reason: string, currentStage?: string) =>
  NextResponse.json({ success: false, error, reason, currentStage }, { status })

export async function POST(request: Request) {
  const session = await auth()
  const triggeredBy = session?.user?.name
  if (!triggeredBy) return failure(401, "Unauthorized", "Sign in required")

  if (!allow(triggeredBy)) {
    return failure(429, "Too many requests", "Rate limit exceeded; try again shortly")
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return failure(400, "Invalid body", "Body must be JSON")
  }
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return failure(400, "Invalid body", parsed.error.issues.map((i) => i.message).join("; "))
  }
  const { seasonId, targetStage } = parsed.data
  const notes = parsed.data.notes ?? ""

  const row = await writeClient.fetch<SeasonRow | null>(seasonQuery, { id: seasonId })
  if (!row) return failure(404, "Not found", "Season not found")

  const season: SeasonState = {
    stage: row.stage ?? "planning",
    cropId: row.cropId,
    plantingDate: row.plantingDate,
    actualHarvest: row.actualHarvest,
    yieldAmount: row.yieldAmount,
  }

  const result = evaluate(season, targetStage, {
    now: new Date(),
    treatmentCount: row.treatmentCount,
    notes,
    minDaysToGrowing: MIN_DAYS_TO_GROWING,
  })
  if (!result.ok) {
    const error = result.kind === "guard-failed" ? "Guard failed" : "Invalid transition"
    return failure(400, error, result.reason, season.stage)
  }

  const entry = {
    _key: crypto.randomUUID(),
    _type: "stageChange",
    stage: targetStage,
    previousStage: season.stage,
    timestamp: new Date().toISOString(),
    triggeredBy,
    ...(notes.trim() ? { notes: notes.trim() } : {}),
  }

  // ifRevisionId makes a concurrent change fail instead of being overwritten.
  const updated = await writeClient
    .transaction()
    .patch(seasonId, (p) =>
      p
        .ifRevisionId(row._rev)
        .set({ stage: targetStage })
        .setIfMissing({ stageHistory: [] })
        .append("stageHistory", [entry]),
    )
    .commit<{ _id: string; stage: string; stageHistory: unknown[] }>({ returnDocuments: true })
    .then((docs) => docs[0] ?? null)
    .catch((e: unknown) => {
      if (isRevisionConflict(e)) return "conflict" as const
      throw e
    })

  if (updated === "conflict") {
    return failure(
      409,
      "Conflict",
      "Season changed while transitioning; reload and retry",
      season.stage,
    )
  }

  return NextResponse.json({
    success: true,
    season: updated,
    weatherSnapshot: null,
    message: `Season advanced to ${targetStage}`,
  })
}

function isRevisionConflict(e: unknown): boolean {
  return typeof e === "object" && e !== null && "statusCode" in e && e.statusCode === 409
}
