import { createRateLimiter } from "../../src/lib/rateLimit"
import { parseEnv } from "../_lib/env"
import { docId, errorResponse, guard, json } from "../_lib/http"
import { noteText, noteTitle, ownsNote, storedNotes } from "../../src/lib/notes"
import { documentAt, historyGet } from "../_lib/history"
import { readClient } from "../_lib/sanity"

const allow = createRateLimiter(30, 60_000)
// Each entry costs one extra History API call (the document at that revision); Workers allow 50
// subrequests per invocation.
const LIMIT = 12

// The field each type's timeline shows at every revision.
const STATE_FIELD: Record<string, string> = {
  season: "stage",
  agronomyRecommendation: "status",
}

type Transaction = {
  id: string
  timestamp: string
  mutations: Record<string, unknown>[]
}

export type HistoryEntry = {
  rev: string
  timestamp: string
  action: "created" | "updated" | "deleted"
  state: string | null
  // Seasons only: the notes this revision added, edited or deleted. Empty for the oldest entry in
  // the window unless it is the create, since there is nothing older to compare it with.
  notes: NoteChange[]
}

export type NoteChange = {
  key: string
  change: "added" | "edited" | "deleted"
  title: string
  // Revision to restore this note from (this one, or the one before a delete); null when the note
  // already reads that way now or the caller does not own it.
  restoreFrom: string | null
}

type NoteText = Map<string, { text: string; title: string; ownerId?: string }>

function notesOf(doc: Record<string, unknown> | null): NoteText {
  const out: NoteText = new Map()
  for (const [key, note] of storedNotes(doc?.notes)) {
    out.set(key, { text: noteText(note.body), title: noteTitle(note.body), ownerId: note.ownerId })
  }
  return out
}

function noteChanges(
  user: string,
  now: NoteText,
  before: NoteText,
  current: NoteText,
  rev: string,
  olderRev: string | null,
): NoteChange[] {
  const restorable = (key: string, note: { text: string; ownerId?: string }) =>
    current.get(key)?.text !== note.text && ownsNote(user, current.get(key), note)
  const out: NoteChange[] = []
  for (const [key, note] of now) {
    const old = before.get(key)
    if (old && old.text === note.text) continue
    out.push({
      key,
      change: old ? "edited" : "added",
      title: note.title,
      restoreFrom: restorable(key, note) ? rev : null,
    })
  }
  for (const [key, note] of before) {
    if (now.has(key)) continue
    out.push({
      key,
      change: "deleted",
      title: note.title,
      restoreFrom: olderRev && restorable(key, note) ? olderRev : null,
    })
  }
  return out
}

function actionOf(tx: Transaction): HistoryEntry["action"] {
  const kinds = tx.mutations.flatMap((m) => Object.keys(m))
  if (kinds.includes("delete")) return "deleted"
  if (kinds.some((k) => k.startsWith("create"))) return "created"
  return "updated"
}

// Audit timeline of a season or recommendation from the Sanity History API (token only, so it
// runs here). Newest first; each entry carries the stage or status at that revision. Authors are
// not returned: every write uses the same token, and who acted is recorded on the document.
export const onRequestGet: PagesFunction = async ({ request, env: rawEnv }) => {
  const env = parseEnv(rawEnv)
  const guarded = await guard(request, env, allow, { write: false })
  if (!guarded.ok) return guarded.response

  const id = docId.safeParse(new URL(request.url).searchParams.get("id"))
  if (!id.success) return errorResponse(400, "Expected ?id=<document id>")

  const type = await readClient(env).fetch<string | null>(`*[_id == $id][0]._type`, {
    id: id.data,
  })
  const field = type ? STATE_FIELD[type] : undefined
  if (!field) return errorResponse(404, "No history for this document")

  let entries: HistoryEntry[]
  try {
    const ndjson = await historyGet(
      env,
      `/transactions/${id.data}?excludeContent=true&reverse=true&limit=${LIMIT}`,
    )
    const transactions = ndjson
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => JSON.parse(line) as Transaction)

    const docs = await Promise.all(
      transactions.map((tx) =>
        actionOf(tx) === "deleted" ? null : documentAt(env, id.data, tx.id),
      ),
    )
    const texts = docs.map(notesOf)
    const current = texts[0] ?? new Map()
    entries = transactions.map((tx, i) => {
      const action = actionOf(tx)
      const value = docs[i]?.[field]
      const older = transactions[i + 1]
      const notes =
        type !== "season"
          ? []
          : older
            ? noteChanges(
                guarded.user,
                texts[i] ?? new Map(),
                texts[i + 1] ?? new Map(),
                current,
                tx.id,
                older.id,
              )
            : action === "created"
              ? noteChanges(guarded.user, texts[i] ?? new Map(), new Map(), current, tx.id, null)
              : []
      return {
        rev: tx.id,
        timestamp: tx.timestamp,
        action,
        state: typeof value === "string" ? value : null,
        notes,
      }
    })
  } catch (e) {
    return errorResponse(502, e instanceof Error ? e.message : "Sanity History API failed")
  }
  return json({ entries })
}
