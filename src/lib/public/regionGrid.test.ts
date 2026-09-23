import { describe, expect, it } from "vitest"

import { addArchiveDays, COLS, emptyGrid, nextWindow, ROWS, seasonStart } from "./regionGrid"

const N = ROWS * COLS

// Archive rows for every grid point with the same readings; `gapAt` blanks one land cell's day.
function archive(days: string[], max: number, min: number, gapAt?: { cell: number; day: number }) {
  return Array.from({ length: N }, (_, k) => ({
    elevation: 100,
    daily: {
      time: days,
      temperature_2m_max: days.map((_, i) => (gapAt?.cell === k && gapAt.day === i ? null : max)),
      temperature_2m_min: days.map(() => min),
    },
  }))
}

describe("seasonStart", () => {
  it("uses 1 May of this year from May on, last year before", () => {
    expect(seasonStart(new Date("2026-09-23T10:00:00Z"))).toBe("2026-05-01")
    expect(seasonStart(new Date("2026-05-01T00:00:00Z"))).toBe("2026-05-01")
    expect(seasonStart(new Date("2026-04-30T23:00:00Z"))).toBe("2025-05-01")
  })
})

describe("nextWindow", () => {
  const grid = emptyGrid("2026-05-01", Array(N).fill(100))

  it("starts the day after throughDate and caps at 14 days", () => {
    expect(nextWindow(grid, new Date("2026-09-23T10:00:00Z"))).toEqual({
      from: "2026-05-01",
      to: "2026-05-14",
    })
  })

  it("stops at yesterday and is null when up to date", () => {
    const g = { ...grid, throughDate: "2026-09-20" }
    expect(nextWindow(g, new Date("2026-09-23T10:00:00Z"))).toEqual({
      from: "2026-09-21",
      to: "2026-09-22",
    })
    expect(nextWindow({ ...g, throughDate: "2026-09-22" }, new Date("2026-09-23T10:00:00Z"))).toBe(
      null,
    )
  })
})

describe("addArchiveDays", () => {
  const elev = Array<number>(N).fill(100)
  elev[0] = 0 // one sea cell

  it("adds degree days to land cells only and advances throughDate", () => {
    const grid = emptyGrid("2026-05-01", elev)
    const next = addArchiveDays(grid, archive(["2026-05-01", "2026-05-02"], 20, 10))
    expect(next.throughDate).toBe("2026-05-02")
    expect(next.cells[1]?.gdd).toBe(30) // (20 + 10) / 2 - 0, twice
    expect(next.cells[0]?.gdd).toBeUndefined()
  })

  it("stops before the first day any land cell is missing", () => {
    const grid = emptyGrid("2026-05-01", elev)
    const days = ["2026-05-01", "2026-05-02", "2026-05-03"]
    const next = addArchiveDays(grid, archive(days, 20, 10, { cell: 5, day: 1 }))
    expect(next.throughDate).toBe("2026-05-01")
    expect(next.cells[5]?.gdd).toBe(15)
  })

  it("ignores gaps in sea cells", () => {
    const grid = emptyGrid("2026-05-01", elev)
    const next = addArchiveDays(grid, archive(["2026-05-01"], 20, 10, { cell: 0, day: 0 }))
    expect(next.throughDate).toBe("2026-05-01")
  })

  it("leaves the grid unchanged when the first day is incomplete", () => {
    const grid = emptyGrid("2026-05-01", elev)
    expect(addArchiveDays(grid, archive(["2026-05-01"], 20, 10, { cell: 3, day: 0 }))).toBe(grid)
  })
})
