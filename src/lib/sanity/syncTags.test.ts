import { describe, expect, it } from "vitest"

import { touchesTags } from "./syncTags"

describe("touchesTags", () => {
  const loaded = new Set(["s1:a", "s1:b"])

  it("matches when any event tag was loaded", () => {
    expect(touchesTags(["s1:x", "s1:b"], loaded)).toBe(true)
  })

  it("ignores events for other content", () => {
    expect(touchesTags(["s1:x", "s1:y"], loaded)).toBe(false)
  })

  it("ignores empty events and empty loads", () => {
    expect(touchesTags([], loaded)).toBe(false)
    expect(touchesTags(["s1:a"], new Set())).toBe(false)
  })
})
