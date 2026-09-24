import { newNoteKey, NOTES_MAX_COUNT, notesSchema, textToBlocks } from "../../src/lib/notes"
import { createRateLimiter } from "../../src/lib/rateLimit"
import { parseEnv } from "../_lib/env"
import { errorResponse, guard, issues, json, readJsonBody } from "../_lib/http"
import { isRevisionConflict, writeClient } from "../_lib/sanity"

// Notes live inside an existing season and are capped at NOTES_MAX_COUNT per season, so they
// carry no global cap; the per-IP limit bounds churn. Shared with /api/notes/restore.
export const allowNotes = createRateLimiter(10, 60_000)

// Adds, edits or deletes one of a season's notes. Text arrives as plain text and is stored as
// Portable Text. The patch uses ifRevisionID with the revision the editor loaded, so a concurrent
// change returns 409 instead of being lost.
export const onRequestPost: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  const guarded = await guard(request, env, allowNotes, { write: true })
  if (!guarded.ok) return guarded.response

  const raw = await readJsonBody(request)
  if (!raw.ok) return raw.response
  const body = notesSchema.safeParse(raw.value)
  if (!body.success) return errorResponse(400, issues(body.error))
  const req = body.data

  const client = writeClient(env)
  const season = await client.fetch<{ keys: string[] | null } | null>(
    `*[_type == "season" && _id == $id][0]{ "keys": notes[_type == "seasonNote"]._key }`,
    { id: req.seasonId },
  )
  if (!season) return errorResponse(404, "Season not found")
  const keys = season.keys ?? []

  const now = new Date().toISOString()
  let patch = client.patch(req.seasonId).ifRevisionId(req.rev)
  if (req.action === "add") {
    if (keys.length >= NOTES_MAX_COUNT) {
      return errorResponse(409, `A season holds at most ${NOTES_MAX_COUNT} notes`)
    }
    patch = patch.setIfMissing({ notes: [] }).append("notes", [
      {
        _type: "seasonNote",
        _key: newNoteKey(),
        createdAt: now,
        author: guarded.user,
        body: textToBlocks(req.text, newNoteKey),
      },
    ])
  } else {
    if (!keys.includes(req.key)) return errorResponse(404, "Note not found")
    // The key is validated as alphanumeric, so it is safe inside the path expression.
    const path = `notes[_key=="${req.key}"]`
    patch =
      req.action === "edit"
        ? patch.set({
            [`${path}.body`]: textToBlocks(req.text, newNoteKey),
            [`${path}.updatedAt`]: now,
          })
        : patch.unset([path])
  }

  try {
    const saved = await patch.commit()
    return json({ _rev: saved._rev })
  } catch (e) {
    if (isRevisionConflict(e)) {
      return errorResponse(409, "The season changed since you loaded it; reload and try again")
    }
    throw e
  }
}
