import { notesRestoreSchema } from "../../../src/lib/notes"
import { parseEnv } from "../../_lib/env"
import { documentAt, HistoryError } from "../../_lib/history"
import { errorResponse, guard, issues, json, readJsonBody } from "../../_lib/http"
import { isRevisionConflict, writeClient } from "../../_lib/sanity"
import { allowNotes } from "../notes"

// Puts a season's notes back to what they were at an earlier revision, read from the Sanity
// History API. Like /api/notes, the patch uses ifRevisionID so a concurrent change returns 409.
export const onRequestPost: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  const guarded = await guard(request, env, allowNotes, { write: true })
  if (!guarded.ok) return guarded.response

  const raw = await readJsonBody(request)
  if (!raw.ok) return raw.response
  const body = notesRestoreSchema.safeParse(raw.value)
  if (!body.success) return errorResponse(400, issues(body.error))
  const { seasonId, rev, fromRev } = body.data

  let doc: Record<string, unknown> | null
  try {
    doc = await documentAt(env, seasonId, fromRev)
  } catch (e) {
    if (e instanceof HistoryError && e.status === 404) doc = null
    else return errorResponse(502, e instanceof Error ? e.message : "Sanity History API failed")
  }
  if (doc?._type !== "season" || doc._id !== seasonId || doc._rev !== fromRev) {
    return errorResponse(404, "No such revision of this season")
  }

  const notes = Array.isArray(doc.notes) && doc.notes.length > 0 ? doc.notes : null
  try {
    const patch = writeClient(env).patch(seasonId).ifRevisionId(rev)
    const saved = await (notes ? patch.set({ notes }) : patch.unset(["notes"])).commit()
    return json({ _rev: saved._rev })
  } catch (e) {
    if (isRevisionConflict(e)) {
      return errorResponse(409, "The season changed since you loaded it; reload and try again")
    }
    throw e
  }
}
