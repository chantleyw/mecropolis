import { describe, expect, it } from "vitest"

import { blocksToText, notesSchema, noteTitle, storedNotes, textToBlocks } from "./notes"

const keys = () => {
  let n = 0
  return () => `k${n++}`
}

describe("textToBlocks", () => {
  it("makes one block per paragraph and joins wrapped lines", () => {
    const blocks = textToBlocks("First line\nsame paragraph\n\nSecond", keys())
    expect(blocks.map((b) => b.children.map((c) => c.text).join(""))).toEqual([
      "First line same paragraph",
      "Second",
    ])
    expect(blocks.every((b) => b.listItem === undefined)).toBe(true)
  })
  it("turns a paragraph of dash lines into bullets", () => {
    const blocks = textToBlocks("- one\n- two", keys())
    expect(blocks).toHaveLength(2)
    expect(blocks.every((b) => b.listItem === "bullet" && b.level === 1)).toBe(true)
  })
  it("marks **bold** spans strong and leaves an unmatched ** literal", () => {
    const [block] = textToBlocks("Rain **12 mm** today **", keys())
    expect(block?.children.map((c) => [c.text, c.marks])).toEqual([
      ["Rain ", []],
      ["12 mm", ["strong"]],
      [" today **", []],
    ])
  })
  it("returns no blocks for blank text", () => {
    expect(textToBlocks("  \n\n ", keys())).toEqual([])
  })
  it("gives every block and span a unique key", () => {
    const blocks = textToBlocks("a **b**\n\n- c\n- d", keys())
    const all = blocks.flatMap((b) => [b._key, ...b.children.map((c) => c._key)])
    expect(new Set(all).size).toBe(all.length)
  })
})

describe("blocksToText", () => {
  it("round-trips paragraphs, bullets and bold", () => {
    const text = "Sprayed **north** block\n\n- check aphids\n- recheck Friday\n\nDone"
    expect(blocksToText(textToBlocks(text, keys()))).toBe(text)
  })
})

describe("notesSchema", () => {
  const add = { action: "add", seasonId: "s", rev: "r", text: "x" }
  it("accepts a note and rejects text over the limit, blank text and dotted ids", () => {
    expect(notesSchema.safeParse(add).success).toBe(true)
    expect(notesSchema.safeParse({ ...add, text: "x".repeat(5001) }).success).toBe(false)
    expect(notesSchema.safeParse({ ...add, text: " \n " }).success).toBe(false)
    expect(notesSchema.safeParse({ ...add, seasonId: "drafts.s" }).success).toBe(false)
  })
  it("rejects text that would store as too many blocks or spans", () => {
    expect(notesSchema.safeParse({ ...add, text: "- a\n".repeat(101) }).success).toBe(false)
    expect(notesSchema.safeParse({ ...add, text: "**a**b".repeat(151) }).success).toBe(false)
    expect(notesSchema.safeParse({ ...add, text: "- a\n".repeat(100) }).success).toBe(true)
  })
  it("needs an alphanumeric key to edit or delete", () => {
    expect(notesSchema.safeParse({ ...add, action: "edit", key: "k1" }).success).toBe(true)
    expect(notesSchema.safeParse({ ...add, action: "edit" }).success).toBe(false)
    expect(
      notesSchema.safeParse({ action: "delete", seasonId: "s", rev: "r", key: 'a"]' }).success,
    ).toBe(false)
  })
})

describe("storedNotes and noteTitle", () => {
  it("keeps only season notes and titles them by their first line", () => {
    const body = textToBlocks("**Rain** 12 mm\n\nSecond paragraph", keys())
    const notes = storedNotes([
      { _type: "block", _key: "old", children: [] },
      { _type: "seasonNote", _key: "k1", createdAt: "2026-09-20T08:00:00Z", body },
    ])
    expect([...notes.keys()]).toEqual(["k1"])
    expect(noteTitle(notes.get("k1")?.body ?? [])).toBe("Rain 12 mm")
  })
})
