import type { WeatherPlan } from "@/lib/workflow/effects"
import { fetchArchive, fetchForecast, summarize } from "./openmeteo"

export interface Coordinates {
  lat: number
  lng: number
}

// Runs the planned weather call and returns the series with its summary.
export async function runWeatherPlan(plan: WeatherPlan, at: Coordinates) {
  const series =
    plan.kind === "forecast"
      ? await fetchForecast(at.lat, at.lng, plan.forecastDays)
      : await fetchArchive(at.lat, at.lng, plan.start, plan.end)
  return { series, ...summarize(series) }
}
