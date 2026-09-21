import { describe, expect, it } from "vitest"
import { cropModelFor } from "@/lib/agronomy/cropModel"
import { accumulateGdd } from "@/lib/agronomy/gdd"
import { planAdvances, seasonPatch } from "./reconcile"
import type { SeasonState, TransitionContext } from "./types"

const wheat = cropModelFor("wheat")
if (!wheat) throw new Error("wheat model missing")

// 20 C max / 10 C min every day = 15 GDD/day (base 0): emergence day 8, pre-harvest 1980 day 132, maturity 2200 day 147.
function series(days: number, start = "2026-01-01") {
  const time: string[] = []
  for (let i = 0; i < days; i++) {
    time.push(
      new Date(Date.parse(`${start}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10),
    )
  }
  return { time, tempMax: time.map(() => 20), tempMin: time.map(() => 10) }
}

const season = (over: Partial<SeasonState> = {}): SeasonState => ({
  stage: "planning",
  cropId: "c",
  plantingDate: "2026-01-01",
  actualHarvest: null,
  yieldAmount: null,
  derivedMaturityDate: null,
  ...over,
})

const ctx = (days: number, over: Partial<TransitionContext> = {}): TransitionContext => {
  const daily = series(days)
  const end = daily.time[days - 1] ?? "2026-01-01"
  return {
    now: new Date(`${end}T12:00:00Z`),
    notes: "",
    cropModel: wheat,
    gdd: accumulateGdd(daily, { start: "2026-01-01", end }, wheat),
    minCoverage: 0.9,
    preHarvestFraction: 0.9,
    seasonArchiveComplete: false,
    benchmarkResolved: false,
    ...over,
  }
}

describe("planAdvances", () => {
  it("walks planning to growing with effective dates from the crossing", () => {
    const plan = planAdvances(season(), ctx(20))
    expect(plan.hops.map((h) => h.to)).toEqual(["planted", "growing"])
    expect(plan.hops[0]).toMatchObject({ effectiveDate: "2026-01-01", derivedFrom: "plantingDate" })
    expect(plan.hops[1]).toMatchObject({ effectiveDate: "2026-01-08", gddTotal: 120 })
    expect(plan.blockedBy).toContain("GDD")
  })
  it("blocks at emergence when GDD is short", () => {
    const plan = planAdvances(season(), ctx(5))
    expect(plan.hops.map((h) => h.to)).toEqual(["planted"])
    expect(plan.blockedBy).toContain("120")
  })
  it("reaches harvested on maturity and stops for the benchmark", () => {
    const plan = planAdvances(season(), ctx(150))
    expect(plan.hops.at(-1)).toMatchObject({ to: "harvested", effectiveDate: "2026-05-27" })
    expect(plan.derivedMaturityDate).toBe("2026-05-27")
    expect(plan.blockedBy).toContain("archive")
  })
  it("reaches review with a benchmark and archive, without implying a field yield", () => {
    const plan = planAdvances(
      season(),
      ctx(150, { seasonArchiveComplete: true, benchmarkResolved: true }),
    )
    const last = plan.hops.at(-1)
    expect(last).toMatchObject({ to: "review", derivedFrom: "regional-benchmark" })
    expect(last?.basis).toContain("regional benchmark resolved")
    expect(last?.basis.toLowerCase()).not.toContain("yield")
    expect(plan.blockedBy).toBeNull()
  })
  it("never proposes rejection", () => {
    const plan = planAdvances(season({ stage: "pre-harvest" }), ctx(20))
    expect(plan.hops).toEqual([])
    expect(plan.hops.some((h) => h.to === "growing")).toBe(false)
  })
  it("stops without a crop model after planting", () => {
    const plan = planAdvances(season(), ctx(20, { cropModel: null }))
    expect(plan.hops.map((h) => h.to)).toEqual(["planted"])
    expect(plan.blockedBy).toContain("crop model")
  })
  it("blocks a hop whose effective date is in the future", () => {
    const plan = planAdvances(season({ plantingDate: "2026-02-01" }), ctx(20))
    expect(plan.hops).toEqual([])
    expect(plan.blockedBy).toContain("future")
  })
})

describe("seasonPatch", () => {
  it("never writes yieldAmount or actualHarvest", () => {
    const s = season()
    const plan = planAdvances(s, ctx(150, { seasonArchiveComplete: true, benchmarkResolved: true }))
    const patch = seasonPatch(plan, s)
    expect(patch).toMatchObject({ stage: "review", derivedMaturityDate: "2026-05-27" })
    expect(Object.keys(patch)).not.toContain("yieldAmount")
    expect(Object.keys(patch)).not.toContain("actualHarvest")
  })
  it("is empty when nothing changed", () => {
    const s = season()
    expect(seasonPatch(planAdvances(s, ctx(1, { cropModel: null, gdd: null })), s)).toEqual({
      stage: "planted",
    })
    expect(seasonPatch({ hops: [], blockedBy: "x", derivedMaturityDate: null }, s)).toEqual({})
  })
})
