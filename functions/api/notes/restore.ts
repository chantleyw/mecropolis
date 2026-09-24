import {
  NOTES_MAX_COUNT,
  newNoteKey,
  notesRestoreSchema,
  noteText,
  noteTextProblem,
  ownsNote,
  storedNotes,
  textToBlocks,
} from "../../../src/lib/notes"
import { parseEnv } from "../../_lib/env"
import { commitCountedNoteWrite, NOTE_WRITES_PER_HOUR } from "../../_lib/noteWrites"
import { documentAt, HistoryError } from "../../_lib/history"
import { errorResponse, guard, issues, json, readJsonBody } from "../../_lib/http"
import { isRevisionConflict, writeClient } from "../../_lib/sanity"
import { allowNotes } from "../notes"

// Puts one season note back to what it was at an earlier revision, read from the Sanity History
// API: a deleted note is re-added, an edited one gets its old text back, and other notes are left
// alone. Only the note's owner may restore it (ownsNote). Like /api/notes, the patch uses ifRevisionID so a concurrent change returns 409.
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
  if (noteTextProblem(text)) {
    return errorResponse(422, "That note cannot be restored")
  }

  const client = writeClient(env)
  const current = await client.fetch<{
    notes: { _key: string; ownerId: string | null }[] | null
  } | null>(
    `*[_type == "season" && _id == $id][0]{ "notes": notes[_type == "seasonNote"]{ _key, ownerId } }`,
    { id: seasonId },
  )
  if (!current) return errorResponse(404, "Season not found")
  const notes = current.notes ?? []
  const existing = notes.find((n) => n._key === key)
  if (!ownsNote(guarded.user, existing, note)) {
    return errorResponse(403, "Only the account that wrote this note can restore it")
  }
  // A copy from before notes had owners gets its owner back, which ownsNote just matched.
  const restored = { ...note, ownerId: guarded.user, body: textToBlocks(text, newNoteKey) }

  let patch = client.patch(seasonId).ifRevisionId(rev)
  if (existing) {
    // The key is validated as alphanumeric, so it is safe inside the path expression.
    patch = patch.set({ [`notes[_key=="${key}"]`]: restored })
  } else if (notes.length >= NOTES_MAX_COUNT) {
    return errorResponse(409, `A season holds at most ${NOTES_MAX_COUNT} notes`)
  } else {
    patch = patch.setIfMissing({ notes: [] }).append("notes", [restored])
  }
  try {
    const saved = await commitCountedNoteWrite(client, patch)
    if (!saved) {
      return errorResponse(
        429,
        `Note limit of ${NOTE_WRITES_PER_HOUR} changes an hour reached, try again later`,
      )
    }
    return json({ _rev: saved })
  } catch (e) {
    if (isRevisionConflict(e)) {
      return errorResponse(409, "The season changed since you loaded it; reload and try again")
    }
    throw e
  }
}
