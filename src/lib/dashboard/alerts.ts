import { reasonText, type ProgressResult } from "@/lib/dashboard/progress"
import { t } from "@/lib/i18n/store"

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
        title: t("dashboard.alert.overdue.title", { where }),
        evidence: t("dashboard.alert.overdue.evidence", { date: s.plantingDate }),
        seasonId: s.id,
      })
    }
    if (s.result.status === "missing") {
      alerts.push({
        key: `missing-${s.id}`,
        tone: "sky",
        title: t("dashboard.alert.missing.title", { where }),
        evidence: reasonText(s.result.reason),
        seasonId: s.id,
      })
    } else if (s.result.status === "error") {
      alerts.push({
        key: `error-${s.id}`,
        tone: "warn",
        title: t("dashboard.alert.error.title", { where }),
        evidence: t("dashboard.alert.error.evidence"),
        seasonId: s.id,
      })
    } else if (
      s.result.progress.pct >= 100 &&
      (s.stage === "planted" || s.stage === "growing" || s.stage === "pre-harvest")
    ) {
      alerts.push({
        key: `mature-${s.id}`,
        tone: "heat",
        title: t("dashboard.alert.mature.title", { where }),
        evidence: t("dashboard.alert.mature.evidence", {
          total: Math.round(s.result.progress.total),
          maturity: Math.round(s.result.progress.maturity),
          stage: t(`stage.${s.stage}`),
        }),
        seasonId: s.id,
      })
    }
    if (s.pestCount > 0) {
      alerts.push({
        key: `pests-${s.id}`,
        tone: "sky",
        title: t("dashboard.alert.pests.title", { where }),
        evidence: t("dashboard.alert.pests.evidence", { count: s.pestCount }),
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
        title: t("dashboard.alert.frost.title"),
        evidence: t("dashboard.alert.frost.evidence", {
          limit: FROST_C,
          count: frost.length,
          date: frost[0]?.date ?? "",
        }),
        seasonId: null,
      })
    }
    const heat = forecast.filter((d) => d.max !== null && d.max >= HEAT_C)
    if (heat.length > 0) {
      alerts.push({
        key: "forecast-heat",
        tone: "heat",
        title: t("dashboard.alert.heat.title"),
        evidence: t("dashboard.alert.heat.evidence", {
          limit: HEAT_C,
          count: heat.length,
          date: heat[0]?.date ?? "",
        }),
        seasonId: null,
      })
    }
  }

  return alerts.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone])
}
