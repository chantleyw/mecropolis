import type { ProgressResult } from "@/lib/dashboard/progress"

export interface AlertSeason {
  id: string
  label: string
  fieldName: string
  stage: string | null
  plantingDate: string | null
  pestCount: number
  result: ProgressResult
}

export interface AlertWeatherDay {
  date: string
  min: number | null
  max: number | null
}

export interface Alert {
  key: string
  tone: "warn" | "heat" | "sky"
  title: string
  /** The data that triggered the alert, stated as a fact. */
  evidence: string
  seasonId: string | null
}

export const FROST_C = 0
export const HEAT_C = 32
const TONE_ORDER: Record<Alert["tone"], number> = { warn: 0, heat: 1, sky: 2 }
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

// Every alert is a stated rule over data already loaded; nothing is scored or predicted.
export function buildAlerts(
  seasons: AlertSeason[],
  forecast: AlertWeatherDay[] | null,
  today: string,
): Alert[] {
  const alerts: Alert[] = []

  for (const s of seasons) {
    const where = `${s.label}, ${s.fieldName}`
    if (s.stage === "planning" && s.plantingDate && s.plantingDate <= today) {
      alerts.push({
        key: `overdue-${s.id}`,
        tone: "heat",
        title: `${where} has not advanced from planning`,
        evidence: `Planting date ${s.plantingDate} has passed. Run "Reconcile now" on the season.`,
        seasonId: s.id,
      })
    }
    if (s.result.status === "missing") {
      alerts.push({
        key: `missing-${s.id}`,
        tone: "sky",
        title: `${where} has no GDD progress`,
        evidence: s.result.reason,
        seasonId: s.id,
      })
    } else if (s.result.status === "error") {
      alerts.push({
        key: `error-${s.id}`,
        tone: "warn",
        title: `${where} weather fetch failed`,
        evidence: "The weather archive could not be read.",
        seasonId: s.id,
      })
    } else if (
      s.result.progress.pct >= 100 &&
      (s.stage === "planted" || s.stage === "growing" || s.stage === "pre-harvest")
    ) {
      alerts.push({
        key: `mature-${s.id}`,
        tone: "heat",
        title: `${where} has reached thermal maturity`,
        evidence: `${Math.round(s.result.progress.total)} GDD of ${Math.round(s.result.progress.maturity)}, stage is still ${s.stage}.`,
        seasonId: s.id,
      })
    }
    if (s.pestCount > 0) {
      alerts.push({
        key: `pests-${s.id}`,
        tone: "sky",
        title: `${where} has stored pest sightings`,
        evidence: `${s.pestCount} regional GBIF ${plural(s.pestCount, "record", "records")} within the search radius.`,
        seasonId: s.id,
      })
    }
  }

  if (forecast) {
    const frost = forecast.filter((d) => d.min !== null && d.min <= FROST_C)
    if (frost.length > 0) {
      alerts.push({
        key: "forecast-frost",
        tone: "warn",
        title: "Frost in the forecast",
        evidence: `Minimum at or below ${FROST_C} C on ${frost.length} ${plural(frost.length, "day", "days")}, first ${frost[0]?.date}.`,
        seasonId: null,
      })
    }
    const heat = forecast.filter((d) => d.max !== null && d.max >= HEAT_C)
    if (heat.length > 0) {
      alerts.push({
        key: "forecast-heat",
        tone: "heat",
        title: "Heat in the forecast",
        evidence: `Maximum at or above ${HEAT_C} C on ${heat.length} ${plural(heat.length, "day", "days")}, first ${heat[0]?.date}.`,
        seasonId: null,
      })
    }
  }

  return alerts.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone])
}
