import { describe, expect, it } from "vitest"
import { cropModelFor } from "@/lib/agronomy/cropModel"
import { buildSeasonEvidence } from "./build"
import { evidenceLabel } from "./labels"

const model = cropModelFor("wheat")
const base = {
  seasonId: "s1",
  cropId: "c1",
  fieldId: "f1",
  model,
  gdd: { total: 1342.26, daysWithData: 9, daysInWindow: 10, coverage: 0.9, running: [] },
  benchmarkResolved: true,
  guards: [{ name: "maturing", result: { valid: false as const, reason: "below threshold" } }],
  weatherSnapshotIds: ["weatherSnapshot.a"],
}

describe("buildSeasonEvidence", () => {
  it("lists documents, calculations, guards, snapshots and benchmark in order", () => {
    const refs = buildSeasonEvidence(base)
    expect(refs.map((r) => r.kind)).toEqual([
      "sanity-doc",
      "sanity-doc",
      "sanity-doc",
      "calculation",
      "calculation",
      "calculation",
      "weather-snapshot",
      "benchmark",
    ])
  })
  it("rounds GDD and keeps a failed guard reason", () => {
    const refs = buildSeasonEvidence(base)
    expect(refs).toContainEqual(expect.objectContaining({ name: "gdd", result: "1342.3 GDD" }))
    expect(refs).toContainEqual(
      expect.objectContaining({ name: "guard.maturing", result: "below threshold" }),
    )
  })
  it("omits inputs that are missing instead of inventing them", () => {
    const refs = buildSeasonEvidence({
      ...base,
      cropId: null,
      fieldId: null,
      model: null,
      gdd: null,
      guards: [],
      weatherSnapshotIds: [],
      benchmarkResolved: false,
    })
    expect(refs.map((r) => r.kind)).toEqual(["sanity-doc", "benchmark"])
    expect(evidenceLabel(refs[1]!)).toBe("Regional benchmark: not resolved")
  })
})
