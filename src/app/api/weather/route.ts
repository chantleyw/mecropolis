import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { createRateLimiter } from "@/lib/rateLimit"
import { writeClient } from "@/lib/sanity/writeClient"
import { fetchProjection } from "@/lib/weather/climate"
import { fetchArchive, fetchForecast, summarize } from "@/lib/weather/openmeteo"

const allow = createRateLimiter(30, 60_000)

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), "not a real date")

const querySchema = z
  .object({
    fieldId: z.string().min(1).max(200),
    start: isoDate.optional(),
    end: isoDate.optional(),
  })
  .refine((q) => (q.start === undefined) === (q.end === undefined), {
    message: "start and end must be given together",
  })
  .refine((q) => !q.start || !q.end || q.start <= q.end, {
    message: "start must not be after end",
  })

const fail = (status: number, error: string) => NextResponse.json({ error }, { status })

export async function GET(request: Request) {
  const session = await auth()
  const user = session?.user?.name
  if (!user) return fail(401, "Sign in required")
  if (!allow(user)) return fail(429, "Rate limit exceeded; try again shortly")

  const params = new URL(request.url).searchParams
  const parsed = querySchema.safeParse({
    fieldId: params.get("fieldId") ?? undefined,
    start: params.get("start") ?? undefined,
    end: params.get("end") ?? undefined,
  })
  if (!parsed.success) return fail(400, parsed.error.issues.map((i) => i.message).join("; "))
  const { fieldId, start, end } = parsed.data

  const coords = await writeClient.fetch<{ lat: number | null; lng: number | null } | null>(
    `*[_type == "field" && _id == $id][0].farm->coordinates{lat, lng}`,
    { id: fieldId },
  )
  if (!coords || coords.lat === null || coords.lng === null) {
    return fail(404, "Field or farm coordinates not found")
  }

  const today = new Date().toISOString().slice(0, 10)
  try {
    if (!start || !end) {
      const series = await fetchForecast(coords.lat, coords.lng, 14)
      return NextResponse.json({ kind: "forecast", data: series, ...summarize(series) })
    }
    if (end <= today) {
      const series = await fetchArchive(coords.lat, coords.lng, start, end)
      return NextResponse.json({ kind: "archive", data: series, ...summarize(series) })
    }
    if (start > today) {
      const projection = await fetchProjection(coords.lat, coords.lng, start, end)
      return NextResponse.json({ kind: "projection", data: null, ...projection })
    }
    return fail(400, "Range must be entirely past or entirely future")
  } catch (e) {
    return fail(502, e instanceof Error ? e.message : "Weather fetch failed")
  }
}
