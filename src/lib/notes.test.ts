import { describe, expect, it } from "vitest"

import { blocksToText, notesSchema, textToBlocks } from "./notes"

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
  it("rejects text over the limit and dotted ids", () => {
    expect(notesSchema.safeParse({ seasonId: "s", rev: "r", text: "x".repeat(5001) }).success).toBe(
      false,
    )
    expect(notesSchema.safeParse({ seasonId: "drafts.s", rev: "r", text: "" }).success).toBe(false)
  })
})
