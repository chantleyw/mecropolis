import { describe, expect, it } from "vitest"
import { toCsv } from "@/lib/dashboard/csv"

describe("toCsv", () => {
  it("writes a header and rows", () => {
    const out = toCsv(
      [{ a: "x", b: 1 }],
      [
        { header: "A", value: (r) => r.a },
        { header: "B", value: (r) => r.b },
      ],
    )
    expect(out).toBe("A,B\r\nx,1\r\n")
  })

  it("quotes commas, quotes and newlines, and leaves null empty", () => {
    const out = toCsv(
      [{ a: 'say "hi", ok', b: null as number | null }],
      [
        { header: "A", value: (r) => r.a },
        { header: "B", value: (r) => r.b },
      ],
    )
    expect(out).toBe('A,B\r\n"say ""hi"", ok",\r\n')
  })
})
