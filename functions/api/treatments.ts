import { treatmentSchema } from "../../src/lib/fieldLog"
import { createRateLimiter } from "../../src/lib/rateLimit"
import { parseEnv } from "../_lib/env"
import { errorResponse, guard, issues, json, readJsonBody } from "../_lib/http"
import { writeClient } from "../_lib/sanity"

const allow = createRateLimiter(30, 60_000)
// Global hourly cap across isolates, counted in Sanity (see observations.ts).
const WRITES_PER_HOUR = 60

// Operator-entered treatment for a season. The applicator is the signed-in user.
export const onRequestPost: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  const authz = await guard(request, env, allow, { write: true })
  if (!authz.ok) return authz.response
  const raw = await readJsonBody(request)
  if (!raw.ok) return raw.response
  const body = treatmentSchema.safeParse(raw.value)
  if (!body.success) return errorResponse(400, issues(body.error))
  const input = body.data

  const client = writeClient(env)
  const { season, recent } = await client.fetch<{ season: string | null; recent: number }>(
    `{
      "season": *[_type == "season" && _id == $id][0]._id,
      "recent": count(*[_type == "treatment" && dateTime(_createdAt) > dateTime($since)])
    }`,
    { id: input.seasonId, since: new Date(Date.now() - 3_600_000).toISOString() },
  )
  if (recent >= WRITES_PER_HOUR) {
    return errorResponse(429, "Treatment limit reached for this hour, try again later")
  }
  if (!season) return errorResponse(404, "Unknown season")

  const created = await client.create({
    _type: "treatment",
    season: { _type: "reference", _ref: season },
    date: input.date,
    type: input.type,
    product: input.product,
    applicator: authz.user,
    ...(input.dosage ? { dosage: input.dosage } : {}),
    ...(input.method ? { method: input.method } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
  })
  return json({ _id: created._id }, 201)
}
