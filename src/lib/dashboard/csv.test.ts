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

  it("stops text cells from running as spreadsheet formulas but keeps numbers", () => {
    const out = toCsv(
      [
        { a: '=HYPERLINK("http://x","y")', b: -3 },
        { a: "+1", b: 0 },
        { a: "-2", b: 0 },
        { a: "@SUM(A1)", b: 0 },
        { a: "\tx", b: 0 },
        { a: "\rx", b: 0 },
      ],
      [
        { header: "A", value: (r) => r.a },
        { header: "B", value: (r) => r.b },
      ],
    )
    expect(out).toBe(
      'A,B\r\n"\'=HYPERLINK(""http://x"",""y"")",-3\r\n\'+1,0\r\n\'-2,0\r\n\'@SUM(A1),0\r\n\'\tx,0\r\n"\'\rx",0\r\n',
    )
  })
})
