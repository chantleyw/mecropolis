import { describe, expect, it } from "vitest"
import { evaluate, type Evaluation } from "./guards"
import type { SeasonState, TransitionContext } from "./types"

const season = (over: Partial<SeasonState> = {}): SeasonState => ({
  stage: "planning",
  cropId: "crop1",
  plantingDate: "2026-06-01",
  actualHarvest: null,
  yieldAmount: null,
  ...over,
})

const ctx = (over: Partial<TransitionContext> = {}): TransitionContext => ({
  now: new Date("2026-06-08T12:00:00Z"),
  treatmentCount: 0,
  notes: "",
  minDaysToGrowing: 7,
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

describe("planted -> growing", () => {
  const planted = (d: string | null) => season({ stage: "planted", plantingDate: d })
  it("passes at exactly 7 days", () => {
    expect(evaluate(planted("2026-06-01"), "growing", ctx())).toEqual({ ok: true })
  })
  it("blocks at 6 days", () => {
    expect(reason(evaluate(planted("2026-06-02"), "growing", ctx()))).toContain("6 so far")
  })
  it("honours a configured minimum", () => {
    expect(evaluate(planted("2026-06-06"), "growing", ctx({ minDaysToGrowing: 2 }))).toEqual({
      ok: true,
    })
  })
  it("blocks a future plantingDate without negative counts", () => {
    expect(reason(evaluate(planted("2026-07-01"), "growing", ctx()))).toContain("0 so far")
  })
  it("blocks without plantingDate", () => {
    expect(evaluate(planted(null), "growing", ctx())).toMatchObject({ ok: false })
  })
})

describe("growing -> pre-harvest", () => {
  const growing = season({ stage: "growing" })
  it("passes with a treatment", () => {
    expect(evaluate(growing, "pre-harvest", ctx({ treatmentCount: 1 }))).toEqual({ ok: true })
  })
  it("blocks with none", () => {
    expect(reason(evaluate(growing, "pre-harvest", ctx()))).toContain("treatment")
  })
})

describe("pre-harvest -> harvested", () => {
  const pre = (d: string | null) => season({ stage: "pre-harvest", actualHarvest: d })
  it("passes with actualHarvest", () => {
    expect(evaluate(pre("2026-11-10"), "harvested", ctx())).toEqual({ ok: true })
  })
  it("blocks without it", () => {
    expect(reason(evaluate(pre(null), "harvested", ctx()))).toContain("actualHarvest")
  })
})

describe("harvested -> review", () => {
  const h = (y: number | null) => season({ stage: "harvested", yieldAmount: y })
  it("passes with a yield, including zero", () => {
    expect(evaluate(h(3200), "review", ctx())).toEqual({ ok: true })
    expect(evaluate(h(0), "review", ctx())).toEqual({ ok: true })
  })
  it("blocks without one", () => {
    expect(reason(evaluate(h(null), "review", ctx()))).toContain("yieldAmount")
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
