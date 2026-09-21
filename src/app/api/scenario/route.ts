import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { cropModelFor } from "@/lib/agronomy/cropModel"
import { runScenario } from "@/lib/agronomy/scenario"
import { createRateLimiter } from "@/lib/rateLimit"
import { loadSeason } from "@/lib/sanity/queries"
import { fetchArchive } from "@/lib/weather/openmeteo"
import { seasonWindow } from "@/lib/workflow/effects"

const bodySchema = z.object({
  seasonId: z.string().min(1).max(200),
  plantingShiftDays: z.number().int().min(-30).max(30),
  tempAdjustC: z.number().min(-5).max(5),
})

const allow = createRateLimiter(20, 60_000)

const failure = (status: number, error: string, reason: string) =>
  NextResponse.json({ success: false, error, reason }, { status })

// Ephemeral calculation over observed weather; nothing is written.
export async function POST(request: Request) {
  const user = (await auth())?.user?.name
  if (!user) return failure(401, "Unauthorized", "Sign in required")
  if (!allow(user)) return failure(429, "Too many requests", "Rate limit exceeded")

  const raw: unknown = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return failure(400, "Invalid body", parsed.error.issues.map((i) => i.message).join("; "))
  }
  const { seasonId, plantingShiftDays, tempAdjustC } = parsed.data

  const season = await loadSeason(seasonId)
  if (!season) return failure(404, "Not found", "Season not found")

  const modelName = season.gddModelKey ?? season.cropName
  const model = modelName ? cropModelFor(modelName) : null
  if (!model) return failure(422, "Unavailable", "No GDD model for this crop")
  if (!season.plantingDate || !season.growthCycleDays) {
    return failure(422, "Unavailable", "Planting date or growth cycle is not set")
  }
  const { lat, lng } = season.coordinates ?? {}
  if (lat == null || lng == null) {
    return failure(422, "Unavailable", "No coordinates for this field")
  }
  const window = seasonWindow(
    season.plantingDate,
    season.growthCycleDays,
    new Date().toISOString().slice(0, 10),
  )
  if (!window) return failure(422, "Unavailable", "Planting date is in the future")

  try {
    const series = await fetchArchive(lat, lng, window.start, window.end)
    const result = runScenario({
      daily: series.daily,
      window,
      model,
      plantingShiftDays,
      tempAdjustC,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    return failure(
      502,
      "Weather archive unavailable",
      e instanceof Error ? e.message : "Fetch failed",
    )
  }
}
