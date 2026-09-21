import { describe, expect, it } from "vitest"
import {
  filterSeasons,
  gridClass,
  sortSeasons,
  toBoardResult,
  type BoardSeason,
} from "@/lib/dashboard/board"

const mk = (id: string, over: Partial<BoardSeason>): BoardSeason => ({
  id,
  cropName: "Wheat",
  year: 2026,
  fieldId: `f-${id}`,
  fieldName: `Field ${id}`,
  colour: null,
  stage: "growing",
  plantingDate: "2026-06-01",
  expectedHarvest: null,
  pestCount: 0,
  result: { status: "error" },
  curve: [],
  ...over,
})
const ok = (pct: number): BoardSeason["result"] => ({
  status: "ok",
  total: 1,
  maturity: 2,
  pct,
  daysWithData: 1,
  daysInWindow: 1,
})

describe("board helpers", () => {
  const seasons = [
    mk("a", { result: ok(20), plantingDate: "2026-07-01", stage: "planted" }),
    mk("b", { result: ok(80), cropName: "Canola" }),
    mk("c", { stage: "review" }),
  ]

  it("filters by search, stage set and field", () => {
    const stages = new Set(["planted", "growing"])
    expect(filterSeasons(seasons, "", stages, null).map((s) => s.id)).toEqual(["a", "b"])
    expect(filterSeasons(seasons, "cano", stages, null).map((s) => s.id)).toEqual(["b"])
    expect(filterSeasons(seasons, "", stages, "f-a").map((s) => s.id)).toEqual(["a"])
  })

  it("sorts by progress with unavailable results last", () => {
    expect(sortSeasons(seasons, "Progress").map((s) => s.id)).toEqual(["b", "a", "c"])
  })

  it("sorts by planting date and stage", () => {
    expect(sortSeasons(seasons, "Planting date").map((s) => s.id)[2]).toBe("a")
    expect(sortSeasons(seasons, "Stage").map((s) => s.id)).toEqual(["a", "b", "c"])
  })

  it("keeps the standard grid for three or fewer and widens for five", () => {
    expect(gridClass(3)).toContain("lg:grid-cols-3")
    expect(gridClass(2)).toContain("lg:grid-cols-3")
    expect(gridClass(5)).toContain("lg:grid-cols-5")
  })

  it("drops the daily series when converting a result", () => {
    const r = toBoardResult({
      status: "ok",
      progress: { total: 1, maturity: 2, pct: 50, daysWithData: 1, daysInWindow: 1, running: [] },
    })
    expect("running" in r).toBe(false)
  })
})
