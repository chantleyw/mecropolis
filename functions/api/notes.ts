import {
  newNoteKey,
  NOTES_MAX_COUNT,
  notesSchema,
  ownsNote,
  textToBlocks,
} from "../../src/lib/notes"
import { createRateLimiter } from "../../src/lib/rateLimit"
import { parseEnv } from "../_lib/env"
import { commitCountedNoteWrite, NOTE_WRITES_PER_HOUR } from "../_lib/noteWrites"
import { errorResponse, guard, issues, json, readJsonBody } from "../_lib/http"
import { isRevisionConflict, writeClient } from "../_lib/sanity"

// Per-IP limit shared with /api/notes/restore; both also count against the global hourly cap in
// _lib/noteWrites.ts, and a season holds at most NOTES_MAX_COUNT notes.
export const allowNotes = createRateLimiter(10, 60_000)

// Adds, edits or deletes one of a season's notes. Text arrives as plain text and is stored as
// Portable Text. A new note is owned by the session user, and only its owner may edit or delete it. The patch uses ifRevisionID with the revision the editor loaded, so a concurrent
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
  const season = await client.fetch<{
    notes: { _key: string; ownerId: string | null }[] | null
  } | null>(
    `*[_type == "season" && _id == $id][0]{ "notes": notes[_type == "seasonNote"]{ _key, ownerId } }`,
    { id: req.seasonId },
  )
  if (!season) return errorResponse(404, "Season not found")
  const notes = season.notes ?? []

  const now = new Date().toISOString()
  let patch = client.patch(req.seasonId).ifRevisionId(req.rev)
  if (req.action === "add") {
    if (notes.length >= NOTES_MAX_COUNT) {
      return errorResponse(409, `A season holds at most ${NOTES_MAX_COUNT} notes`)
    }
    patch = patch.setIfMissing({ notes: [] }).append("notes", [
      {
        _type: "seasonNote",
        _key: newNoteKey(),
        createdAt: now,
        author: guarded.user,
        ownerId: guarded.user,
        body: textToBlocks(req.text, newNoteKey),
      },
    ])
  } else {
    const note = notes.find((n) => n._key === req.key)
    if (!note) return errorResponse(404, "Note not found")
    if (!ownsNote(guarded.user, note)) {
      return errorResponse(403, "Only the account that wrote this note can change it")
    }
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
