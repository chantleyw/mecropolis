import { describe, expect, it } from "vitest"
import { cropModelFor } from "@/lib/agronomy/cropModel"
import type { GddAccumulation } from "@/lib/agronomy/gdd"
import { evaluate, type Evaluation } from "./guards"
import type { SeasonState, TransitionContext } from "./types"

const wheat = cropModelFor("wheat")
if (!wheat) throw new Error("wheat model missing")
const model = wheat // emergence 120, maturity 2200

const season = (over: Partial<SeasonState> = {}): SeasonState => ({
  stage: "planning",
  cropId: "crop1",
  plantingDate: "2026-06-01",
  actualHarvest: null,
  yieldAmount: null,
  derivedMaturityDate: null,
  ...over,
})

const gdd = (total: number, coverage = 1): GddAccumulation => ({
  total,
  daysWithData: Math.round(coverage * 10),
  daysInWindow: 10,
  coverage,
  running: [],
})

const ctx = (over: Partial<TransitionContext> = {}): TransitionContext => ({
  now: new Date("2026-06-08T12:00:00Z"),
  notes: "",
  cropModel: model,
  gdd: gdd(0),
  minCoverage: 0.9,
  preHarvestFraction: 0.9,
  seasonArchiveComplete: false,
  benchmarkResolved: false,
  ...over,
})

const reason = (r: Evaluation) => (r.ok ? "" : r.reason)

describe("planning -> planted", () => {
  it("passes with plantingDate and crop", () => {
    expect(evaluate(season(), "planted", ctx())).toEqual({ ok: true })
  })
  it("blocks without plantingDate", () => {
    const r = evaluate(season({ plantingDate: null }), "planted", ctx())
    expect(r).toMatchObject({ ok: false, kind: "guard-failed" })
    expect(reason(r)).toContain("plantingDate")
  })
  it("blocks without crop", () => {
    expect(reason(evaluate(season({ cropId: null }), "planted", ctx()))).toContain("crop")
  })
})

describe("planted -> growing (emerged)", () => {
  const planted = season({ stage: "planted" })
  it("passes at exactly the emergence threshold", () => {
    expect(evaluate(planted, "growing", ctx({ gdd: gdd(120) }))).toEqual({ ok: true })
  })
  it("blocks below it, naming the number and threshold", () => {
    const r = reason(evaluate(planted, "growing", ctx({ gdd: gdd(119.5) })))
    expect(r).toContain("119.5")
    expect(r).toContain("120")
  })
  it("fails distinctly for a missing model, missing GDD and low coverage", () => {
    const noModel = reason(evaluate(planted, "growing", ctx({ cropModel: null })))
    const noGdd = reason(evaluate(planted, "growing", ctx({ gdd: null })))
    const low = reason(evaluate(planted, "growing", ctx({ gdd: gdd(500, 0.5) })))
    expect(noModel).toContain("crop model")
    expect(noGdd).toContain("temperature data")
    expect(low).toContain("coverage")
    expect(new Set([noModel, noGdd, low]).size).toBe(3)
  })
})

describe("growing -> pre-harvest (maturing)", () => {
  const growing = season({ stage: "growing" })
  it("passes at preHarvestFraction of the maturity threshold", () => {
    expect(evaluate(growing, "pre-harvest", ctx({ gdd: gdd(1980) }))).toEqual({ ok: true })
  })
  it("blocks below it, naming the number and threshold", () => {
    const r = reason(evaluate(growing, "pre-harvest", ctx({ gdd: gdd(1500) })))
    expect(r).toContain("1500")
    expect(r).toContain("1980")
  })
  it("blocks on low coverage even when the total is high", () => {
    expect(reason(evaluate(growing, "pre-harvest", ctx({ gdd: gdd(2500, 0.5) })))).toContain(
      "coverage",
    )
  })
})

describe("pre-harvest -> harvested (matured)", () => {
  const pre = (d: string | null) => season({ stage: "pre-harvest", derivedMaturityDate: d })
  it("passes when a maturity crossing exists", () => {
    expect(evaluate(pre("2026-11-10"), "harvested", ctx())).toEqual({ ok: true })
  })
  it("blocks without one, naming the number and threshold", () => {
    const r = reason(evaluate(pre(null), "harvested", ctx({ gdd: gdd(2100) })))
    expect(r).toContain("2100")
    expect(r).toContain("2200")
  })
  it("fails distinctly for a missing model and missing GDD", () => {
    expect(reason(evaluate(pre(null), "harvested", ctx({ cropModel: null })))).toContain(
      "crop model",
    )
    expect(reason(evaluate(pre(null), "harvested", ctx({ gdd: null })))).toContain(
      "temperature data",
    )
  })
})

describe("harvested -> review (contextComplete)", () => {
  const h = season({ stage: "harvested" })
  it("passes with the archive snapshot and a resolved benchmark", () => {
    const c = ctx({ seasonArchiveComplete: true, benchmarkResolved: true })
    expect(evaluate(h, "review", c)).toEqual({ ok: true })
  })
  it("does not require a field yield", () => {
    const c = ctx({ seasonArchiveComplete: true, benchmarkResolved: true })
    expect(evaluate(season({ stage: "harvested", yieldAmount: null }), "review", c).ok).toBe(true)
  })
  it("blocks without the archive snapshot", () => {
    const c = ctx({ benchmarkResolved: true })
    expect(reason(evaluate(h, "review", c))).toContain("archive")
  })
  it("blocks without a resolved benchmark", () => {
    const c = ctx({ seasonArchiveComplete: true })
    expect(reason(evaluate(h, "review", c))).toContain("benchmark")
  })
})

describe("pre-harvest -> growing (rejection)", () => {
  const pre = season({ stage: "pre-harvest" })
  it("passes with a reason", () => {
    expect(evaluate(pre, "growing", ctx({ notes: "Late frost damage" }))).toEqual({ ok: true })
  })
  it("blocks blank or whitespace notes", () => {
    expect(reason(evaluate(pre, "growing", ctx({ notes: "   " })))).toContain("reason")
  })
})

describe("invalid transitions", () => {
  it("are reported before guards run", () => {
    const r = evaluate(season(), "growing", ctx())
    expect(r).toMatchObject({ ok: false, kind: "invalid-transition" })
    expect(reason(r)).toContain("Valid targets: planted")
  })
})
