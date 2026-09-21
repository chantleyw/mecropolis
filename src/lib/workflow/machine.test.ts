import { describe, expect, it } from "vitest"
import { STAGES, type Stage } from "./types"
import { TRANSITIONS, checkTransition, validTargets } from "./machine"

const allowed: [Stage, Stage][] = [
  ["planning", "planted"],
  ["planted", "growing"],
  ["growing", "pre-harvest"],
  ["pre-harvest", "harvested"],
  ["pre-harvest", "growing"],
  ["harvested", "review"],
]

describe("machine", () => {
  it.each(allowed)("allows %s -> %s", (from, to) => {
    expect(checkTransition(from, to)).toEqual({ valid: true })
  })

  it("rejects every pair not in the table", () => {
    for (const from of STAGES) {
      for (const to of STAGES) {
        const expected = allowed.some(([f, t]) => f === from && t === to)
        expect(checkTransition(from, to).valid).toBe(expected)
      }
    }
  })

  it("names valid targets in the rejection reason", () => {
    expect(checkTransition("planning", "growing")).toEqual({
      valid: false,
      reason: "Cannot transition from planning to growing. Valid targets: planted",
    })
  })

  it("review is final", () => {
    expect(validTargets("review")).toEqual([])
    const r = checkTransition("review", "planning")
    expect(r.valid === false && r.reason).toContain("final stage")
  })

  it("covers every stage", () => {
    expect(Object.keys(TRANSITIONS).sort()).toEqual([...STAGES].sort())
  })
})
