import type { GddWindow } from "@/lib/agronomy/gdd"

const DAY_MS = 86_400_000

const addDays = (date: string, days: number): string =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)

/**
 * Archive window for GDD: planting to today, bounded to twice the crop cycle so a stalled season
 * does not request an unbounded range. Null when planting has not happened yet.
 */
export function seasonWindow(
  plantingDate: string,
  growthCycleDays: number,
  today: string,
): GddWindow | null {
  if (plantingDate > today) return null
  const bound = addDays(plantingDate, growthCycleDays * 2)
  return { start: plantingDate, end: bound < today ? bound : today }
}

// plantingDate + growth cycle, as YYYY-MM-DD (UTC, so the result does not depend on server zone).
export function expectedHarvestDate(plantingDate: string, growthCycleDays: number): string {
  return addDays(plantingDate, growthCycleDays)
}
