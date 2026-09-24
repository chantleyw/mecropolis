import { z } from "zod"

// Season notes are stored as Portable Text. Operators write plain text in our own editor:
// paragraphs separated by a blank line, "- " lines as bullets, **bold** as the strong mark. The
// Function converts that text to blocks, so clients never send raw Portable Text.

export const NOTES_MAX_CHARS = 5000

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

export const notesSchema = z.object({
  seasonId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/, "invalid document id"),
  rev: z.string().min(1).max(64),
  text: z.string().max(NOTES_MAX_CHARS, `Notes are limited to ${NOTES_MAX_CHARS} characters`),
})
