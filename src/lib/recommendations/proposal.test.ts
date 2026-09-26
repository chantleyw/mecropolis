import { describe, expect, it } from "vitest"

import { MAX_EVIDENCE, proposalSchema, toEvidenceItems } from "./proposal"

describe("toEvidenceItems", () => {
  it("keeps ids as refs and folds calculation inputs into the detail", () => {
    const items = toEvidenceItems([
      { kind: "sanity-doc", docType: "field", id: "field-1", label: "Field" },
      { kind: "weather-snapshot", id: "wx-1", label: "Snapshot" },
      {
        kind: "calculation",
        name: "gdd",
        label: "GDD to date",
        inputs: { base: 5, days: null },
        result: "812 GDD",
      },
      { kind: "benchmark", label: "Benchmark", resolved: false },
      { kind: "external", source: "Open-Meteo", label: "Archive", url: "https://open-meteo.com" },
    ])
    expect(items).toEqual([
      { kind: "sanity-doc", label: "Field", ref: "field-1", detail: "field" },
      { kind: "weather-snapshot", label: "Snapshot", ref: "wx-1" },
      { kind: "calculation", label: "GDD to date", detail: "812 GDD (base 5, days missing)" },
      { kind: "benchmark", label: "Benchmark", detail: "not resolved" },
      { kind: "external", label: "Archive", ref: "https://open-meteo.com" },
    ])
  })
  it("stays within the limits the API accepts", () => {
    const refs = Array.from({ length: MAX_EVIDENCE + 5 }, (_, i) => ({
      kind: "benchmark" as const,
      label: "x".repeat(400) + i,
      resolved: true,
    }))
    const evidence = toEvidenceItems(refs)
    const parsed = proposalSchema.safeParse({
      seasonId: "season-1",
      type: "monitor",
      rationale: "Check",
      evidence,
    })
    expect(parsed.success).toBe(true)
    expect(evidence).toHaveLength(MAX_EVIDENCE)
  })
})
