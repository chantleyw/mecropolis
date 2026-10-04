import { z } from "zod"

// A season's notes are separate entries whose bodies are Portable Text. Operators write plain text in our own editor:
// paragraphs separated by a blank line, "- " lines as bullets, **bold** as the strong mark. The
// Function converts that text to blocks, so clients never send raw Portable Text.

export const NOTES_MAX_CHARS = 5000
// Bullets and bold marks multiply blocks and spans, so a note's stored size is capped too; without
// this, 5000 characters of "- a" lines would store as about 200 KB.
export const NOTE_MAX_BLOCKS = 100
export const NOTE_MAX_SPANS = 300

export type NoteSpan = { _type: "span"; _key: string; text: string; marks: string[] }
export type NoteBlock = {
  _type: "block"
  _key: string
  style: "normal"
  markDefs: never[]
  children: NoteSpan[]
  listItem?: "bullet"
  level?: 1
}

const BULLET = /^\s*[-*]\s+/

function spans(line: string, key: () => string): NoteSpan[] {
  // Split on **...**; odd parts are bold. An unmatched ** stays literal text.
  const parts = line.split(/\*\*(.+?)\*\*/)
  const out = parts.flatMap((text, i) =>
    text === ""
      ? []
      : [{ _type: "span" as const, _key: key(), text, marks: i % 2 ? ["strong"] : [] }],
  )
  return out.length > 0 ? out : [{ _type: "span", _key: key(), text: "", marks: [] }]
}

export function textToBlocks(text: string, key: () => string): NoteBlock[] {
  const blocks: NoteBlock[] = []
  for (const para of text.replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
    const lines = para.split("\n").filter((l) => l.trim() !== "")
    if (lines.length === 0) continue
    if (lines.every((l) => BULLET.test(l))) {
      for (const l of lines) {
        blocks.push({
          _type: "block",
          _key: key(),
          style: "normal",
          markDefs: [],
          listItem: "bullet",
          level: 1,
          children: spans(l.replace(BULLET, "").trim(), key),
        })
      }
    } else {
      blocks.push({
        _type: "block",
        _key: key(),
        style: "normal",
        markDefs: [],
        children: spans(lines.map((l) => l.trim()).join(" "), key),
      })
    }
  }
  return blocks
}

type StoredBlock = {
  listItem?: string | null
  children?: { text?: string | null; marks?: string[] | null }[] | null
}

// Back to the editor's plain text. Consecutive bullets stay in one paragraph.
export function blocksToText(blocks: StoredBlock[]): string {
  let out = ""
  let prevBullet = false
  for (const b of blocks) {
    const line = (b.children ?? [])
      .map((c) => (c.marks?.includes("strong") ? `**${c.text ?? ""}**` : (c.text ?? "")))
      .join("")
    const bullet = b.listItem === "bullet"
    if (out !== "") out += bullet && prevBullet ? "\n" : "\n\n"
    out += bullet ? `- ${line}` : line
    prevBullet = bullet
  }
  return out
}

// Each season holds a list of separate notes, each with its own date and author, so one edit or
// restore touches one note. At most NOTES_MAX_COUNT per season keeps the document bounded.
export const NOTES_MAX_COUNT = 100

// Keys for notes and their blocks; alphanumeric so a key is safe inside a patch path.
export const newNoteKey = () => crypto.randomUUID().replaceAll("-", "").slice(0, 12)

const seasonId = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/, "invalid document id")
const rev = z.string().min(1).max(64)
export const noteKey = z.string().regex(/^[A-Za-z0-9]{1,32}$/, "invalid note key")
// Null when the text fits one note, otherwise the reason it does not.
export function noteTextProblem(text: string): string | null {
  if (text.trim() === "") return "A note cannot be empty"
  if (text.length > NOTES_MAX_CHARS) return `Notes are limited to ${NOTES_MAX_CHARS} characters`
  const blocks = textToBlocks(text, () => "k")
  const spans = blocks.reduce((n, b) => n + b.children.length, 0)
  if (blocks.length > NOTE_MAX_BLOCKS || spans > NOTE_MAX_SPANS) {
    return `A note is limited to ${NOTE_MAX_BLOCKS} paragraphs or bullets and ${NOTE_MAX_SPANS} bold runs`
  }
  return null
}

const text = z.string().superRefine((t, ctx) => {
  const problem = noteTextProblem(t)
  if (problem) ctx.addIssue({ code: "custom", message: problem })
})

export const notesSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), seasonId, rev, text }),
  z.object({ action: z.literal("edit"), seasonId, rev, key: noteKey, text }),
  z.object({ action: z.literal("delete"), seasonId, rev, key: noteKey }),
])
export type NotesRequest = z.infer<typeof notesSchema>
// A request without the season and revision, which the editor fills in.
export type NoteAction = NotesRequest extends infer R
  ? R extends NotesRequest
    ? Omit<R, "seasonId" | "rev">
    : never
  : never

// Put one note back as it was at `fromRev` (a History API revision) onto the season loaded at `rev`.
export const notesRestoreSchema = z.object({
  seasonId,
  rev,
  fromRev: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, "invalid revision"),
  key: noteKey,
})

// A note as stored, read back from history or the dataset. Anything else in the array (such as
// Portable Text blocks from before notes were split) is not a note.
const storedNoteSchema = z.object({
  _type: z.literal("seasonNote"),
  _key: noteKey,
  createdAt: z.string().max(40),
  updatedAt: z.string().max(40).optional(),
  author: z.string().max(100).optional(),
  ownerId: z.string().max(100).optional(),
  body: z.array(z.unknown()),
})

export function storedNotes(value: unknown): Map<string, z.infer<typeof storedNoteSchema>> {
  const out = new Map<string, z.infer<typeof storedNoteSchema>>()
  if (!Array.isArray(value)) return out
  for (const item of value) {
    const note = storedNoteSchema.safeParse(item)
    if (note.success) out.set(note.data._key, note.data)
  }
  return out
}

// A note belongs to the account that wrote it (`ownerId`, the session user); only that account may
// edit, delete or restore it. The owner never changes, so the note as it is now decides; a deleted
// note is judged by the copy being restored. A note without ownerId belongs to no account.
type Owned = { ownerId?: string | null } | null | undefined
export function ownsNote(user: string, current: Owned, restored?: Owned): boolean {
  const owner = current ? current.ownerId : restored?.ownerId
  return typeof owner === "string" && owner === user
}

// Plain text of a stored note body, for comparing revisions and for titles.
export const noteText = (body: unknown[]): string =>
  blocksToText(body.filter((b): b is StoredBlock => typeof b === "object" && b !== null))

export function noteTitle(body: unknown[]): string {
  const line = noteText(body).split("\n")[0]?.replace(/^- /, "").replaceAll("**", "") ?? ""
  return line.length > 60 ? `${line.slice(0, 57)}...` : line
}

export const formatNoteTime = (iso: string, locale = "en-ZA") =>
  new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })
