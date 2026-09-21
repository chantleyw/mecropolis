import type { CropModel } from "./cropModel"
import { accumulateGdd, crossingDate, type DailyTemps, type GddWindow } from "./gdd"

export interface ScenarioInput {
  daily: DailyTemps
  /** Observed window: planting date to today. */
  window: GddWindow
  model: CropModel
  /** Days added to the planting date; negative plants earlier. */
  plantingShiftDays: number
  /** Degrees C added to every daily maximum and minimum. */
  tempAdjustC: number
}

export type ProjectedState = "before-emergence" | "emerged" | "thermal-maturity"

export interface ScenarioSide {
  window: GddWindow
  gdd: number
  coverage: number
  emergenceDate: string | null
  maturityDate: string | null
  state: ProjectedState
}

export interface ScenarioResult {
  observed: ScenarioSide
  scenario: ScenarioSide
}

const DAY_MS = 86_400_000

const shiftDate = (date: string, days: number): string =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)

function stateFor(gdd: number, model: CropModel): ProjectedState {
  if (gdd >= model.gddToMaturity) return "thermal-maturity"
  return gdd >= model.gddToEmergence ? "emerged" : "before-emergence"
}

function side(daily: DailyTemps, window: GddWindow, model: CropModel): ScenarioSide {
  const acc = accumulateGdd(daily, window, model)
  return {
    window,
    gdd: acc.total,
    coverage: acc.coverage,
    emergenceDate: crossingDate(acc, model.gddToEmergence),
    maturityDate: crossingDate(acc, model.gddToMaturity),
    state: stateFor(acc.total, model),
  }
}

/**
 * Re-runs the GDD calculation over the same observed weather with a shifted planting date and a
 * temperature offset. The result is a scenario, not an observation; missing days stay missing.
 */
export function runScenario(input: ScenarioInput): ScenarioResult {
  const { daily, window, model, plantingShiftDays, tempAdjustC } = input
  const adjust = (v: number | null) => (v === null ? null : v + tempAdjustC)
  const adjusted: DailyTemps = {
    time: daily.time,
    tempMax: daily.tempMax.map(adjust),
    tempMin: daily.tempMin.map(adjust),
  }
  return {
    observed: side(daily, window, model),
    scenario: side(
      adjusted,
      { start: shiftDate(window.start, plantingShiftDays), end: window.end },
      model,
    ),
  }
}
