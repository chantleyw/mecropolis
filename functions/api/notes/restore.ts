import {
  NOTES_MAX_CHARS,
  NOTES_MAX_COUNT,
  newNoteKey,
  notesRestoreSchema,
  noteText,
  storedNotes,
  textToBlocks,
} from "../../../src/lib/notes"
import { parseEnv } from "../../_lib/env"
import { documentAt, HistoryError } from "../../_lib/history"
import { errorResponse, guard, issues, json, readJsonBody } from "../../_lib/http"
import { isRevisionConflict, writeClient } from "../../_lib/sanity"
import { allowNotes } from "../notes"

// Puts one season note back to what it was at an earlier revision, read from the Sanity History
// API: a deleted note is re-added, an edited one gets its old text back, and other notes are left
// alone. Like /api/notes, the patch uses ifRevisionID so a concurrent change returns 409.
export const onRequestPost: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  const guarded = await guard(request, env, allowNotes, { write: true })
  if (!guarded.ok) return guarded.response

  const raw = await readJsonBody(request)
  if (!raw.ok) return raw.response
  const body = notesRestoreSchema.safeParse(raw.value)
  if (!body.success) return errorResponse(400, issues(body.error))
  const { seasonId, rev, fromRev, key } = body.data

  let doc: Record<string, unknown> | null
  try {
    doc = await documentAt(env, seasonId, fromRev)
  } catch (e) {
    if (e instanceof HistoryError && e.status === 404) doc = null
    else
      return errorResponse(502, e instanceof HistoryError ? e.message : "Sanity History API failed")
  }
  if (doc?._type !== "season" || doc._id !== seasonId || doc._rev !== fromRev) {
    return errorResponse(404, "No such revision of this season")
  }

  const note = storedNotes(doc.notes).get(key)
  if (!note) return errorResponse(404, "That revision has no such note")
  // Rebuilt from its text, so only the block shapes this app writes are stored again.
  const text = noteText(note.body)
  if (text.trim() === "" || text.length > NOTES_MAX_CHARS) {
    return errorResponse(422, "That note cannot be restored")
  }
  const restored = { ...note, body: textToBlocks(text, newNoteKey) }

  const client = writeClient(env)
  const current = await client.fetch<{ keys: string[] | null } | null>(
    `*[_type == "season" && _id == $id][0]{ "keys": notes[_type == "seasonNote"]._key }`,
    { id: seasonId },
  )
  if (!current) return errorResponse(404, "Season not found")
  const keys = current.keys ?? []

  let patch = client.patch(seasonId).ifRevisionId(rev)
  if (keys.includes(key)) {
    // The key is validated as alphanumeric, so it is safe inside the path expression.
    patch = patch.set({ [`notes[_key=="${key}"]`]: restored })
  } else if (keys.length >= NOTES_MAX_COUNT) {
    return errorResponse(409, `A season holds at most ${NOTES_MAX_COUNT} notes`)
  } else {
    patch = patch.setIfMissing({ notes: [] }).append("notes", [restored])
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
