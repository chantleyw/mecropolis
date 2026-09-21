import { z } from "zod"
import { fetchJson } from "@/lib/http/fetchJson"

const HOST = "https://climate-api.open-meteo.com/v1/climate"

const nums = z.array(z.number().nullable())
const schema = z.object({
  daily: z.object({
    time: z.array(z.string()),
    temperature_2m_max: nums,
    temperature_2m_min: nums,
    precipitation_sum: nums,
  }),
})

// The climate API returns all-null et0 and has no soil series, so the outlook covers
// temperature and rainfall only. It is a CMIP6 model projection, never a forecast.
export interface ProjectionSummary {
  avgTempMax: number
  avgTempMin: number
  totalPrecipitation: number
}

const present = (name: string, v: (number | null)[]) => {
  const kept = v.filter((x): x is number => x !== null)
  if (kept.length === 0) throw new Error(`Climate series "${name}" has no data`)
  return kept
}
const sum = (v: number[]) => v.reduce((a, b) => a + b, 0)
const round = (n: number) => Math.round(n * 100) / 100

export async function fetchProjection(
  lat: number,
  lon: number,
  start: string,
  end: string,
): Promise<{ summary: ProjectionSummary; period: { start: string; end: string } }> {
  const url =
    `${HOST}?latitude=${lat}&longitude=${lon}&start_date=${start}&end_date=${end}` +
    `&models=EC_Earth3P_HR&daily=temperature_2m_max,temperature_2m_min,precipitation_sum`
  const { daily } = await fetchJson(url, schema)
  const max = present("tempMax", daily.temperature_2m_max)
  const min = present("tempMin", daily.temperature_2m_min)
  return {
    summary: {
      avgTempMax: round(sum(max) / max.length),
      avgTempMin: round(sum(min) / min.length),
      totalPrecipitation: round(sum(present("precipitation", daily.precipitation_sum))),
    },
    period: { start, end },
  }
}
