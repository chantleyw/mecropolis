export interface GddParams {
  baseTempC: number
  capTempC: number
}

export interface DailyTemps {
  time: string[]
  tempMax: (number | null)[]
  tempMin: (number | null)[]
}

export interface GddWindow {
  /** Inclusive, YYYY-MM-DD. */
  start: string
  /** Inclusive, YYYY-MM-DD. */
  end: string
}

export interface GddPoint {
  date: string
  gdd: number
  cumulative: number
}

export interface GddAccumulation {
  total: number
  daysWithData: number
  daysInWindow: number
  /** daysWithData / daysInWindow; 0 for an empty window. */
  coverage: number
  running: GddPoint[]
}

const DAY_MS = 86_400_000

/** Average method: both temperatures are capped, then the mean is floored at the base. */
export function dailyGdd(tMax: number, tMin: number, { baseTempC, capTempC }: GddParams): number {
  const mean = (Math.min(tMax, capTempC) + Math.min(tMin, capTempC)) / 2
  return Math.max(0, mean - baseTempC)
}

function daysInclusive(start: string, end: string): number {
  const span = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)
  return span < 0 ? 0 : Math.round(span / DAY_MS) + 1
}

/** Days with a null max or min are skipped and lower coverage; they are never treated as zero. */
export function accumulateGdd(
  daily: DailyTemps,
  window: GddWindow,
  params: GddParams,
): GddAccumulation {
  const running: GddPoint[] = []
  let total = 0
  daily.time.forEach((date, i) => {
    if (date < window.start || date > window.end) return
    const tMax = daily.tempMax[i]
    const tMin = daily.tempMin[i]
    if (tMax === null || tMax === undefined || tMin === null || tMin === undefined) return
    const gdd = dailyGdd(tMax, tMin, params)
    total += gdd
    running.push({ date, gdd, cumulative: total })
  })
  const daysInWindow = daysInclusive(window.start, window.end)
  return {
    total,
    daysWithData: running.length,
    daysInWindow,
    coverage: daysInWindow === 0 ? 0 : running.length / daysInWindow,
    running,
  }
}

/** First date the running total reaches the threshold, or null if it never does. */
export function crossingDate(acc: GddAccumulation, threshold: number): string | null {
  return acc.running.find((p) => p.cumulative >= threshold)?.date ?? null
}
