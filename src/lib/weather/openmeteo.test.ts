import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchArchive, fetchForecast, riskInputs, summarize, type WeatherSeries } from "./openmeteo"

const series = (over: Partial<WeatherSeries["hourly"]> = {}): WeatherSeries => ({
  daily: {
    time: ["2026-01-01", "2026-01-02"],
    tempMax: [30, 20],
    tempMin: [10, 12],
    precipitation: [1.5, null],
    et0: [2, 3],
  },
  hourly: {
    time: ["a", "b"],
    soilTemp: [10, 14],
    soilMoisture: [0.2, 0.3],
    humidity: [70, 90],
    ...over,
  },
})

afterEach(() => vi.unstubAllGlobals())

function stubFetch(body: unknown) {
  const fn = vi.fn().mockResolvedValue(new Response(JSON.stringify(body)))
  vi.stubGlobal("fetch", fn)
  return fn
}

describe("summarize", () => {
  it("averages, totals and skips partial nulls", () => {
    const { summary, period } = summarize(series())
    expect(summary).toEqual({
      avgTempMax: 25,
      avgTempMin: 11,
      totalPrecipitation: 1.5,
      avgSoilTemp: 12,
      avgSoilMoisture: 0.25,
      totalET0: 5,
    })
    expect(period).toEqual({ start: "2026-01-01", end: "2026-01-02" })
  })

  it("throws on an all-null series instead of averaging nothing", () => {
    expect(() => summarize(series({ soilTemp: [null, null] }))).toThrow(/soilTemp/)
  })
})

describe("riskInputs", () => {
  it("returns peak humidity and temperature", () => {
    expect(riskInputs(series())).toEqual({ maxHumidity: 90, maxTemp: 30 })
  })
  it("throws without humidity", () => {
    expect(() => riskInputs(series({ humidity: null }))).toThrow(/humidity/)
  })
})

describe("archive request", () => {
  it("uses the archive host and soil_temperature_0_to_7cm, never soil_temperature_0cm", async () => {
    const fn = stubFetch({
      daily: {
        time: ["2025-06-15"],
        temperature_2m_max: [20],
        temperature_2m_min: [8],
        precipitation_sum: [0],
        et0_fao_evapotranspiration: [1],
      },
      hourly: { time: ["t"], soil_temperature_0_to_7cm: [11], soil_moisture_0_to_7cm: [0.3] },
    })
    const s = await fetchArchive(-33.45, 18.75, "2025-06-15", "2025-06-15")
    const url = String(fn.mock.calls[0]?.[0])
    expect(url).toContain("https://archive-api.open-meteo.com/v1/archive")
    expect(url).toContain("soil_temperature_0_to_7cm")
    expect(url).not.toContain("soil_temperature_0cm")
    expect(s.hourly.soilTemp).toEqual([11])
  })
})

describe("forecast request", () => {
  it("asks for relative humidity and soil_temperature_0cm", async () => {
    const fn = stubFetch({
      daily: {
        time: ["2026-09-21"],
        temperature_2m_max: [20],
        temperature_2m_min: [8],
        precipitation_sum: [0],
        et0_fao_evapotranspiration: [1],
      },
      hourly: {
        time: ["t"],
        soil_temperature_0cm: [11],
        soil_moisture_0_to_7cm: [0.3],
        relative_humidity_2m: [88],
      },
    })
    const s = await fetchForecast(-33.45, 18.75, 7)
    const url = String(fn.mock.calls[0]?.[0])
    expect(url).toContain("relative_humidity_2m")
    expect(url).toContain("forecast_days=7")
    expect(s.hourly.humidity).toEqual([88])
  })

  it("rejects a response whose shape changed", async () => {
    stubFetch({ daily: {}, hourly: {} })
    await expect(fetchForecast(0, 0)).rejects.toThrow(/Unexpected response shape/)
  })
})
