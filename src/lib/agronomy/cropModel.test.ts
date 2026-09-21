import { describe, expect, it } from "vitest"
import { CROP_MODELS, cropModelFor } from "./cropModel"

describe("cropModelFor", () => {
  it("finds a model by name, case-insensitively", () => {
    expect(cropModelFor(" Wheat ")).toBe(CROP_MODELS.wheat)
  })
  it("resolves aliases", () => {
    expect(cropModelFor("Rapeseed")).toBe(CROP_MODELS.canola)
    expect(cropModelFor("Lupins")).toBe(CROP_MODELS["narrow-leafed lupin"])
  })
  it("returns null for an unknown crop", () => {
    expect(cropModelFor("maize")).toBeNull()
  })
  it("takes no category argument, so there is no category fallback", () => {
    expect(cropModelFor.length).toBe(1)
  })
  it("labels every model as a model parameter", () => {
    for (const m of Object.values(CROP_MODELS)) expect(m.source).toContain("Model parameter")
  })
})
