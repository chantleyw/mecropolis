import { describe, expect, it } from "vitest"
import { summarise } from "@/lib/dashboard/summary"

describe("summarise", () => {
  it("totals hectares and groups seasons by crop and stage", () => {
    const s = summarise([
      { hectares: 10, seasons: [{ stage: "growing", cropName: "Wheat" }] },
      {
        hectares: null,
        seasons: [
          { stage: "growing", cropName: "Wheat" },
          { stage: null, cropName: null },
        ],
      },
    ])
    expect(s.hectares).toBe(10)
    expect(s.byCrop).toEqual([
      { crop: "Wheat", seasons: 2 },
      { crop: "Unknown crop", seasons: 1 },
    ])
    expect(s.byStage).toEqual([
      { stage: "growing", seasons: 2 },
      { stage: "planning", seasons: 1 },
    ])
  })
})
