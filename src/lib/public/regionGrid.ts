import { z } from "zod"

import { dailyGdd } from "@/lib/agronomy/gdd"
import { CROP_MODELS } from "@/lib/agronomy/cropModel"
import { fetchJson } from "@/lib/http/fetchJson"

// A fixed 0.25 degree grid over the Western Cape grain belt (Swartland to the Ruens). Every cell
// is one Open-Meteo point; nothing is interpolated. Cells whose grid elevation is 0 m are sea.
export const REGION = { north: -32.25, south: -34.75, west: 17.75, east: 21.75, step: 0.25 }
export const ROWS = Math.round((REGION.north - REGION.south) / REGION.step) + 1
export const COLS = Math.round((REGION.east - REGION.west) / REGION.step) + 1
export const REGION_GRID_ID = "region-grid-western-cape"

// Winter wheat model (hand-authored, citation pending) from 1 May, the usual planting window.
export const REGION_MODEL = CROP_MODELS.wheat!
const SEASON_START_MONTH_DAY = "05-01"

// Open-Meteo counts every location as a call and every 14 days of data as another, so a refresh
// never asks for more than 14 archive days: 187 points cost about 187 calls.
const MAX_DAYS_PER_REFRESH = 14
const ARCHIVE = "https://archive-api.open-meteo.com/v1/archive"
const FORECAST = "https://api.open-meteo.com/v1/forecast"
const TZ = "Africa/Johannesburg"
const DAY_MS = 86_400_000

export interface RegionCell {
  lat: number
  lng: number
  land: boolean
  /** Degree days from the season start to `throughDate`. */
  gdd?: number
  /** Forecast maximum for the forecast's first day, °C. */
  tempMax?: number
  /** Forecast rain over 7 days, mm. */
  rain7?: number
}

/** The stored document, as the browser reads it from Sanity. */
export interface RegionGrid {
  seasonStart: string
  throughDate: string
  archiveUpdatedAt?: string
  forecastAt?: string
  lastAttemptAt?: string
  lastError?: string
  cells: RegionCell[]
}

const isoDate = (t: number) => new Date(t).toISOString().slice(0, 10)
const addDays = (date: string, n: number) => isoDate(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS)

// 1 May of this year, or of last year before May.
export function seasonStart(today: Date): string {
  const y = today.getUTCFullYear()
  const start = `${y}-${SEASON_START_MONTH_DAY}`
  return isoDate(today.getTime()) >= start ? start : `${y - 1}-${SEASON_START_MONTH_DAY}`
}

export function gridPoints(): { lat: number; lng: number }[] {
  const pts: { lat: number; lng: number }[] = []
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      pts.push({
        lat: +(REGION.north - r * REGION.step).toFixed(2),
        lng: +(REGION.west + c * REGION.step).toFixed(2),
      })
  return pts
}

const locationQuery = () => {
  const pts = gridPoints()
  return `latitude=${pts.map((p) => p.lat).join(",")}&longitude=${pts.map((p) => p.lng).join(",")}`
}

const nums = z.array(z.number().nullable())
const archiveSchema = z.array(
  z.object({
    elevation: z.number(),
    daily: z.object({
      time: z.array(z.string()),
      temperature_2m_max: nums,
      temperature_2m_min: nums,
    }),
  }),
)
const forecastSchema = z.array(
  z.object({
    daily: z.object({ temperature_2m_max: nums, precipitation_sum: nums }),
  }),
)

/** A fresh grid for a season: land from the archive's grid elevation, no days counted yet. */
export function emptyGrid(start: string, elevations: number[]): RegionGrid {
  return {
    seasonStart: start,
    throughDate: addDays(start, -1),
    cells: gridPoints().map((p, i) => ({ ...p, land: (elevations[i] ?? 0) > 0 })),
  }
}

type Archive = z.infer<typeof archiveSchema>

async function fetchArchive(from: string, to: string): Promise<Archive> {
  const rows = await fetchJson(
    `${ARCHIVE}?${locationQuery()}&daily=temperature_2m_max,temperature_2m_min&start_date=${from}&end_date=${to}&timezone=${TZ}`,
    archiveSchema,
    { timeoutMs: 30_000 },
  )
  if (rows.length !== ROWS * COLS)
    throw new Error(`Open-Meteo returned ${rows.length} of ${ROWS * COLS} grid points`)
  return rows
}

// Adds the archive days that every land cell has data for, stopping at the first day any land
// cell is missing, so a cell never skips a day. Returns the grid unchanged when no day is complete.
export function addArchiveDays(grid: RegionGrid, archive: Archive): RegionGrid {
  const days = archive[0]?.daily.time ?? []
  let complete = 0
  for (; complete < days.length; complete++) {
    const i = complete
    const gap = grid.cells.some((c, k) => {
      const d = archive[k]?.daily
      return c.land && (d?.temperature_2m_max[i] == null || d.temperature_2m_min[i] == null)
    })
    if (gap) break
  }
  if (complete === 0) return grid
  const cells = grid.cells.map((c, k) => {
    if (!c.land) return c
    const d = archive[k]!.daily
    let add = 0
    for (let i = 0; i < complete; i++)
      add += dailyGdd(d.temperature_2m_max[i]!, d.temperature_2m_min[i]!, REGION_MODEL)
    return { ...c, gdd: Math.round(((c.gdd ?? 0) + add) * 10) / 10 }
  })
  return { ...grid, cells, throughDate: days[complete - 1]! }
}

/** The next archive window to fetch, or null when the grid is up to yesterday. */
export function nextWindow(grid: RegionGrid, now: Date): { from: string; to: string } | null {
  const yesterday = isoDate(now.getTime() - DAY_MS)
  if (grid.throughDate >= yesterday) return null
  const from = addDays(grid.throughDate, 1)
  const cap = addDays(from, MAX_DAYS_PER_REFRESH - 1)
  return { from, to: cap < yesterday ? cap : yesterday }
}

/** Starts a grid for the season when none is stored (or the season rolled over). */
export async function startGrid(now: Date): Promise<RegionGrid> {
  const start = seasonStart(now)
  const rows = await fetchArchive(start, start)
  return emptyGrid(
    start,
    rows.map((r) => r.elevation),
  )
}

export async function advanceArchive(grid: RegionGrid, now: Date): Promise<RegionGrid> {
  const w = nextWindow(grid, now)
  if (!w) return grid
  return addArchiveDays(grid, await fetchArchive(w.from, w.to))
}

const sum = (xs: (number | null)[]) =>
  xs.some((x) => x === null) ? undefined : xs.reduce<number>((a, x) => a + (x ?? 0), 0)

export async function refreshForecast(grid: RegionGrid): Promise<RegionGrid> {
  const rows = await fetchJson(
    `${FORECAST}?${locationQuery()}&daily=temperature_2m_max,precipitation_sum&forecast_days=7&timezone=${TZ}`,
    forecastSchema,
    { timeoutMs: 30_000 },
  )
  if (rows.length !== grid.cells.length)
    throw new Error(`Open-Meteo returned ${rows.length} of ${grid.cells.length} grid points`)
  return {
    ...grid,
    cells: grid.cells.map((c, k) => {
      const d = rows[k]!.daily
      const rest: RegionCell = {
        lat: c.lat,
        lng: c.lng,
        land: c.land,
        ...(c.gdd === undefined ? {} : { gdd: c.gdd }),
      }
      if (!c.land) return rest
      const tempMax = d.temperature_2m_max[0] ?? undefined
      const rain7 = sum(d.precipitation_sum)
      return {
        ...rest,
        ...(tempMax === undefined ? {} : { tempMax }),
        ...(rain7 === undefined ? {} : { rain7: Math.round(rain7 * 10) / 10 }),
      }
    }),
  }
}
