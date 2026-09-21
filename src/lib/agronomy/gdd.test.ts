import { describe, expect, it } from "vitest"
import { accumulateGdd, crossingDate, dailyGdd } from "./gdd"

const params = { baseTempC: 0, capTempC: 25 }

describe("dailyGdd", () => {
  it("averages max and min above the base", () => {
    expect(dailyGdd(20, 10, params)).toBe(15)
  })
  it("caps both temperatures", () => {
    expect(dailyGdd(40, 20, params)).toBe(22.5)
  })
  it("floors at zero", () => {
    expect(dailyGdd(2, -8, params)).toBe(0)
  })
  it("respects a non-zero base", () => {
    expect(dailyGdd(20, 10, { baseTempC: 10, capTempC: 30 })).toBe(5)
  })
})

describe("accumulateGdd", () => {
  const daily = {
    time: ["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04"],
    tempMax: [20, null, 20, 20],
    tempMin: [10, 10, 10, 10],
  }
  it("skips null days and reports coverage", () => {
    const acc = accumulateGdd(daily, { start: "2026-06-01", end: "2026-06-04" }, params)
    expect(acc.total).toBe(45)
    expect(acc.daysWithData).toBe(3)
    expect(acc.daysInWindow).toBe(4)
    expect(acc.coverage).toBe(0.75)
    expect(acc.running.map((p) => p.cumulative)).toEqual([15, 30, 45])
  })
  it("ignores days outside the window", () => {
    const acc = accumulateGdd(daily, { start: "2026-06-03", end: "2026-06-04" }, params)
    expect(acc.total).toBe(30)
    expect(acc.coverage).toBe(1)
  })
  it("counts window days beyond the data as missing", () => {
    const acc = accumulateGdd(daily, { start: "2026-06-01", end: "2026-06-08" }, params)
    expect(acc.daysInWindow).toBe(8)
    expect(acc.coverage).toBe(3 / 8)
  })
  it("returns zero coverage for an inverted window", () => {
    const acc = accumulateGdd(daily, { start: "2026-06-05", end: "2026-06-01" }, params)
    expect(acc).toMatchObject({ total: 0, daysInWindow: 0, coverage: 0 })
  })
})

describe("crossingDate", () => {
  const acc = accumulateGdd(
    {
      time: ["2026-06-01", "2026-06-02", "2026-06-03"],
      tempMax: [20, 20, 20],
      tempMin: [10, 10, 10],
    },
    { start: "2026-06-01", end: "2026-06-03" },
    params,
  )
  it("returns the first date the total reaches the threshold", () => {
    expect(crossingDate(acc, 30)).toBe("2026-06-02")
    expect(crossingDate(acc, 15)).toBe("2026-06-01")
  })
  it("returns null when never reached", () => {
    expect(crossingDate(acc, 46)).toBeNull()
  })
})
