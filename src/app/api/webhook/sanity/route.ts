import { NextResponse } from "next/server"
import { z } from "zod"
import { env } from "@/lib/env"
import { writeClient } from "@/lib/sanity/writeClient"
import { isValidSignature } from "@/lib/webhook/signature"
import { fetchForecast, riskInputs } from "@/lib/weather/openmeteo"
import { assessRisk, RISK_MARKER } from "@/lib/weather/risk"

const payloadSchema = z.object({ _id: z.string().min(1).max(200) })

const reportQuery = `*[_type == "pestReport" && _id == $id][0]{
  _rev, severity, recommendedAction,
  "coordinates": field->farm->coordinates{lat, lng}
}`

interface ReportRow {
  _rev: string
  severity: string | null
  recommendedAction: string | null
  coordinates: { lat: number | null; lng: number | null } | null
}

const reply = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status })

export async function POST(request: Request) {
  // Verify the signature against the raw body before parsing anything.
  const raw = await request.text()
  const header = request.headers.get("sanity-webhook-signature")
  if (!isValidSignature(raw, header, env.SANITY_WEBHOOK_SECRET)) {
    return reply(401, { error: "Invalid signature" })
  }

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return reply(400, { error: "Body must be JSON" })
  }
  const payload = payloadSchema.safeParse(json)
  if (!payload.success) return reply(400, { error: "Missing _id" })

  // Only the id is taken from the payload; the report is re-read so nothing else is trusted.
  const id = payload.data._id
  const row = await writeClient.fetch<ReportRow | null>(reportQuery, { id })
  if (!row) return reply(404, { error: "Pest report not found" })
  if (row.severity !== "high" && row.severity !== "critical") {
    return reply(200, { skipped: "Severity below threshold" })
  }
  if (row.recommendedAction?.includes(RISK_MARKER)) {
    return reply(200, { skipped: "Already assessed" })
  }
  const lat = row.coordinates?.lat
  const lng = row.coordinates?.lng
  if (lat == null || lng == null) return reply(422, { error: "Farm coordinates are not set" })

  let assessment: ReturnType<typeof assessRisk>
  try {
    assessment = assessRisk(riskInputs(await fetchForecast(lat, lng, 7)))
  } catch (e) {
    // 502 makes Sanity retry the delivery.
    return reply(502, { error: e instanceof Error ? e.message : "Weather fetch failed" })
  }

  const existing = row.recommendedAction?.trim()
  const recommendedAction = existing ? `${existing}\n\n${assessment.text}` : assessment.text
  try {
    await writeClient.patch(id).ifRevisionId(row._rev).set({ recommendedAction }).commit()
  } catch (e) {
    if (typeof e === "object" && e !== null && "statusCode" in e && e.statusCode === 409) {
      return reply(409, { error: "Report changed; delivery will be retried" })
    }
    throw e
  }
  return reply(200, { updated: id, elevated: assessment.elevated })
}
