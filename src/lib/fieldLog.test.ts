import { describe, expect, it } from "vitest"

import { treatmentSchema } from "./fieldLog"

const base = { seasonId: "season-1", date: "2026-06-01", type: "fertiliser", product: "LAN 28" }

describe("treatmentSchema", () => {
  it("accepts a minimal treatment and drops blank optional text", () => {
    expect(treatmentSchema.parse({ ...base, dosage: "  ", notes: "" })).toEqual(base)
  })
  it("rejects a future date", () => {
    const later = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10)
    expect(treatmentSchema.safeParse({ ...base, date: later }).success).toBe(false)
  })
  it("rejects a malformed date, an unknown type and a dotted season id", () => {
    expect(treatmentSchema.safeParse({ ...base, date: "2026-06-01x" }).success).toBe(false)
    expect(treatmentSchema.safeParse({ ...base, type: "magic" }).success).toBe(false)
    expect(treatmentSchema.safeParse({ ...base, seasonId: "drafts.s" }).success).toBe(false)
  })
  it("rejects an impossible calendar day", () => {
    expect(treatmentSchema.safeParse({ ...base, date: "2026-02-31" }).success).toBe(false)
    expect(treatmentSchema.safeParse({ ...base, date: "2024-02-29" }).success).toBe(true)
  })
  it("requires a product", () => {
    expect(treatmentSchema.safeParse({ ...base, product: " " }).success).toBe(false)
  })
})
