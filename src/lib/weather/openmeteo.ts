import { z } from "zod"
import { fetchJson } from "@/lib/http/fetchJson"

const FORECAST_HOST = "https://api.open-meteo.com/v1/forecast"
// Archive lives on its own host and has no soil_temperature_0cm (it returns silent nulls).
const ARCHIVE_HOST = "https://archive-api.open-meteo.com/v1/archive"

const nums = z.array(z.number().nullable())

const dailySchema = z.object({
  time: z.array(z.string()),
  temperature_2m_max: nums,
  temperature_2m_min: nums,
  precipitation_sum: nums,
  et0_fao_evapotranspiration: nums,
})

const forecastSchema = z.object({
  daily: dailySchema,
  hourly: z.object({
    time: z.array(z.string()),
    soil_temperature_0cm: nums,
    soil_moisture_0_to_7cm: nums,
    relative_humidity_2m: nums,
  }),
})

const archiveSchema = z.object({
  daily: dailySchema,
  hourly: z.object({
    time: z.array(z.string()),
    soil_temperature_0_to_7cm: nums,
    soil_moisture_0_to_7cm: nums,
  }),
})

export interface WeatherSeries {
  daily: {
    time: string[]
    tempMax: (number | null)[]
    tempMin: (number | null)[]
    precipitation: (number | null)[]
    et0: (number | null)[]
  }
  hourly: {
    time: string[]
    soilTemp: (number | null)[]
    soilMoisture: (number | null)[]
    humidity: (number | null)[] | null
  }
}

export interface WeatherSummary {
  avgTempMax: number
  avgTempMin: number
  totalPrecipitation: number
  avgSoilTemp: number
  avgSoilMoisture: number
  totalET0: number
}

export interface WeatherPeriod {
  start: string
  end: string
}

const DAILY = "temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration"

const coords = (lat: number, lon: number) => `latitude=${lat}&longitude=${lon}`

export async function fetchForecast(
  lat: number,
  lon: number,
  forecastDays = 14,
): Promise<WeatherSeries> {
  const url =
    `${FORECAST_HOST}?${coords(lat, lon)}&daily=${DAILY}` +
    `&hourly=soil_temperature_0cm,soil_moisture_0_to_7cm,relative_humidity_2m` +
    `&forecast_days=${forecastDays}&timezone=auto`
  const r = await fetchJson(url, forecastSchema)
  return {
    daily: toDaily(r.daily),
    hourly: {
      time: r.hourly.time,
      soilTemp: r.hourly.soil_temperature_0cm,
      soilMoisture: r.hourly.soil_moisture_0_to_7cm,
      humidity: r.hourly.relative_humidity_2m,
    },
  }
}

export async function fetchArchive(
  lat: number,
  lon: number,
  start: string,
  end: string,
): Promise<WeatherSeries> {
  const url =
    `${ARCHIVE_HOST}?${coords(lat, lon)}&start_date=${start}&end_date=${end}&daily=${DAILY}` +
    `&hourly=soil_temperature_0_to_7cm,soil_moisture_0_to_7cm&timezone=auto`
  const r = await fetchJson(url, archiveSchema)
  return {
    daily: toDaily(r.daily),
    hourly: {
      time: r.hourly.time,
      soilTemp: r.hourly.soil_temperature_0_to_7cm,
      soilMoisture: r.hourly.soil_moisture_0_to_7cm,
      humidity: null,
    },
  }
}

function toDaily(d: z.infer<typeof dailySchema>): WeatherSeries["daily"] {
  return {
    time: d.time,
    tempMax: d.temperature_2m_max,
    tempMin: d.temperature_2m_min,
    precipitation: d.precipitation_sum,
    et0: d.et0_fao_evapotranspiration,
  }
}

function present(name: string, values: (number | null)[]): number[] {
  const kept = values.filter((v): v is number => v !== null)
  if (kept.length === 0) throw new Error(`Weather series "${name}" has no data`)
  return kept
}

const sum = (v: number[]) => v.reduce((a, b) => a + b, 0)
const mean = (v: number[]) => sum(v) / v.length
const round = (n: number) => Math.round(n * 100) / 100

// Throws when a series is entirely null (the silent-null failure mode); partial nulls are skipped.
export function summarize(s: WeatherSeries): { summary: WeatherSummary; period: WeatherPeriod } {
  const first = s.daily.time[0]
  const last = s.daily.time[s.daily.time.length - 1]
  if (!first || !last) throw new Error("Weather series has no days")
  return {
    summary: {
      avgTempMax: round(mean(present("tempMax", s.daily.tempMax))),
      avgTempMin: round(mean(present("tempMin", s.daily.tempMin))),
      totalPrecipitation: round(sum(present("precipitation", s.daily.precipitation))),
      avgSoilTemp: round(mean(present("soilTemp", s.hourly.soilTemp))),
      avgSoilMoisture: round(mean(present("soilMoisture", s.hourly.soilMoisture))),
      totalET0: round(sum(present("et0", s.daily.et0))),
    },
    period: { start: first, end: last },
  }
}

// Peak relative humidity and max temperature over the series, for pest-spread risk.
export function riskInputs(s: WeatherSeries): { maxHumidity: number; maxTemp: number } {
  if (!s.hourly.humidity) throw new Error("Series has no humidity")
  return {
    maxHumidity: Math.max(...present("humidity", s.hourly.humidity)),
    maxTemp: Math.max(...present("tempMax", s.daily.tempMax)),
  }
}
