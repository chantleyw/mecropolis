import { z } from "zod"

import { createRateLimiter } from "../../src/lib/rateLimit"
import { reserveCall } from "../_lib/counter"
import { parseEnv } from "../_lib/env"
import { docId, errorResponse, guard, issues, json, readJsonBody } from "../_lib/http"
import { writeClient } from "../_lib/sanity"

const allow = createRateLimiter(5, 60_000)
// Each Agent Actions request costs one org AI credit (Free: 1000/month). The per-IP limiter is per
// isolate and the demo login is published, so Sanity holds global hourly and daily counts:
// 25/day stays under 800 in a 31-day month, leaving the rest of the allowance for other AI use.
export const SUMMARIES_PER_HOUR = 10
export const SUMMARIES_PER_DAY = 25
export const SUMMARY_COUNTER_ID = "rate-season-summaries"
export const MAX_SUMMARY_CHARS = 2000

const bodySchema = z.object({ seasonId: docId })

export type SeasonRecords = {
  crop: string | null
  field: string | null
  year: number | null
  stage: string | null
  plantingDate: string | null
  derivedMaturityDate: string | null
  stageChanges: { stage: string | null; effectiveDate: string | null; gddTotal: number | null }[]
  notes: { date: string | null; text: string | null }[]
  observations: { date: string | null; notes: string | null }[]
  treatments: {
    date: string | null
    type: string | null
    product: string | null
    dosage: string | null
    method: string | null
    notes: string | null
  }[]
}

const RECORDS_QUERY = `*[_type == "season" && _id == $id][0]{
  "crop": crop->name, "field": field->name, year, stage, plantingDate, derivedMaturityDate,
  "stageChanges": coalesce(stageHistory, [])[]{ stage, effectiveDate, gddTotal },
  "notes": coalesce(notes, [])[_type == "seasonNote"] | order(createdAt asc)[0...20]{
    "date": createdAt, "text": pt::text(body)
  },
  "observations": *[_type == "observation" && season._ref == ^._id] | order(date asc)[0...30]{
    date, notes
  },
  "treatments": *[_type == "treatment" && season._ref == ^._id] | order(date asc)[0...30]{
    date, type, product, dosage, method, notes
  }
}`

// The model sees only the records passed in $records; the instruction forbids advice and outside
// facts so the summary stays a digest of what the operator entered.
const INSTRUCTION = `You summarise one crop season's farm records for the farm operator.
Records (JSON): $records
Write a plain-text summary of at most 120 words covering what the records show: stage changes and
their growing degree day (GDD) totals, observations, treatments and notes, in date order.
Use only facts stated in the records. Do not give agronomic advice, recommendations, predictions or
yield estimates, and do not add outside knowledge. If a kind of record is empty, say it is not
recorded. No headings, no markdown.`

// Generates a short summary of a season's stored records with Sanity Agent Actions (Prompt) and
// stores it on the season as `aiSummary`. Signed-in, same-origin, and globally capped.
export const onRequestPost: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  const authz = await guard(request, env, allow, { write: true })
  if (!authz.ok) return authz.response
  const body = await readJsonBody(request)
  if (!body.ok) return body.response
  const parsed = bodySchema.safeParse(body.value)
  if (!parsed.success) return errorResponse(400, issues(parsed.error))
  const { seasonId } = parsed.data

  const client = writeClient(env)
  const records = await client.fetch<SeasonRecords | null>(
    RECORDS_QUERY,
    { id: seasonId },
    { perspective: "published" },
  )
  if (!records) return errorResponse(404, "Season not found")
  if (!records.notes.length && !records.observations.length && !records.treatments.length) {
    return errorResponse(422, "No notes, observations or treatments to summarise yet")
  }
  if (
    !(await reserveCall(client, SUMMARY_COUNTER_ID, [
      { limit: SUMMARIES_PER_HOUR, windowMs: 3_600_000 },
      { limit: SUMMARIES_PER_DAY, windowMs: 86_400_000 },
    ]))
  ) {
    return errorResponse(429, "Summary limit reached, try again later")
  }

  // Agent Actions are only served on API version vX.
  const answer = await client.withConfig({ apiVersion: "vX" }).agent.action.prompt({
    instruction: INSTRUCTION,
    instructionParams: { records: JSON.stringify(records) },
    temperature: 0.2,
  })
  const text = answer.trim().slice(0, MAX_SUMMARY_CHARS)
  if (!text) return errorResponse(502, "The summary came back empty")

  const aiSummary = { text, generatedAt: new Date().toISOString() }
  await client.patch(seasonId).set({ aiSummary }).commit()
  return json({ aiSummary })
}
