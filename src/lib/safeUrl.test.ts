import { describe, expect, it } from "vitest"
import { safeHttpUrl } from "./safeUrl"

describe("safeHttpUrl", () => {
  it("accepts http and https", () => {
    expect(safeHttpUrl("https://example.org/a")).toBe("https://example.org/a")
    expect(safeHttpUrl("http://example.org/")).toBe("http://example.org/")
  })
  it("rejects other schemes", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull()
    expect(safeHttpUrl("data:text/html,x")).toBeNull()
  })
  it("rejects empty and unparseable values", () => {
    expect(safeHttpUrl(null)).toBeNull()
    expect(safeHttpUrl("")).toBeNull()
    expect(safeHttpUrl("not a url")).toBeNull()
  })
})
