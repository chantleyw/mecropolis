import type { Stage } from "./types"

export type WeatherPlan =
  { kind: "forecast"; forecastDays: number } | { kind: "archive"; start: string; end: string }

interface PlanInput {
  plantingDate: string | null
  actualHarvest: string | null
  today: string // YYYY-MM-DD
}

// Which weather call a transition triggers; null when the transition has no weather effect.
export function weatherPlanFor(from: Stage, to: Stage, input: PlanInput): WeatherPlan | null {
  if ((from === "planning" && to === "planted") || (from === "planted" && to === "growing")) {
    return { kind: "forecast", forecastDays: 14 }
  }
  if (from === "growing" && to === "pre-harvest" && input.plantingDate) {
    return { kind: "archive", start: input.plantingDate, end: input.today }
  }
  if (from === "pre-harvest" && to === "harvested" && input.plantingDate && input.actualHarvest) {
    // The archive has no future days.
    const end = input.actualHarvest < input.today ? input.actualHarvest : input.today
    return { kind: "archive", start: input.plantingDate, end }
  }
  return null
}

// plantingDate + growth cycle, as YYYY-MM-DD (UTC, so the result does not depend on server zone).
export function expectedHarvestDate(plantingDate: string, growthCycleDays: number): string {
  const d = new Date(`${plantingDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + growthCycleDays)
  return d.toISOString().slice(0, 10)
}
