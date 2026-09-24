import { notesSchema, textToBlocks } from "../../src/lib/notes"
import { createRateLimiter } from "../../src/lib/rateLimit"
import { parseEnv } from "../_lib/env"
import { errorResponse, guard, issues, json, readJsonBody } from "../_lib/http"
import { isRevisionConflict, writeClient } from "../_lib/sanity"

// Notes overwrite one field of an existing season, so they do not grow the dataset and carry no
// global cap; the per-IP limit bounds churn.
const allow = createRateLimiter(10, 60_000)

// Replaces a season's Portable Text notes. The body carries plain text and the revision the editor
// loaded; the patch uses ifRevisionID so a concurrent change returns 409 instead of being lost.
export const onRequestPost: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  const guarded = await guard(request, env, allow, { write: true })
  if (!guarded.ok) return guarded.response

  const raw = await readJsonBody(request)
  if (!raw.ok) return raw.response
  const body = notesSchema.safeParse(raw.value)
  if (!body.success) return errorResponse(400, issues(body.error))

  const client = writeClient(env)
  const exists = await client.fetch<boolean>(`defined(*[_type == "season" && _id == $id][0]._id)`, {
    id: body.data.seasonId,
  })
  if (!exists) return errorResponse(404, "Season not found")

  const blocks = textToBlocks(body.data.text, () => crypto.randomUUID().slice(0, 12))
  try {
    const patch = client.patch(body.data.seasonId).ifRevisionId(body.data.rev)
    const saved = await (
      blocks.length > 0 ? patch.set({ notes: blocks }) : patch.unset(["notes"])
    ).commit()
    return json({ _rev: saved._rev })
  } catch (e) {
    if (isRevisionConflict(e)) {
      return errorResponse(409, "The season changed since you loaded it; reload and try again")
    }
    throw e
  }
}
