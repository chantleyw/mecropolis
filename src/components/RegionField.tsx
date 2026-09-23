import { COLS, REGION, ROWS } from "@/lib/public/regionGrid"
import type { RegionCell, RegionGrid } from "@/lib/public/regionGrid"
import { RAIN_CSS, RAMP_CSS } from "@/lib/public/ramp"

export type Layer = "gdd" | "temp" | "rain"

export const LAYERS: { id: Layer; label: string }[] = [
  { id: "gdd", label: "Degree days" },
  { id: "temp", label: "Max temperature" },
  { id: "rain", label: "Rain, 7 days" },
]

export interface Pin {
  slug: string
  name: string
  lat: number
  lng: number
}

export const value = (c: RegionCell, layer: Layer): number | null =>
  (layer === "gdd" ? c.gdd : layer === "temp" ? c.tempMax : c.rain7) ?? null

export const UNIT: Record<Layer, string> = { gdd: "GDD", temp: "°C", rain: "mm" }

export const fmt = (v: number, layer: Layer) =>
  layer === "gdd" ? Math.round(v).toLocaleString("en-US") : v.toFixed(1)

// Domain per layer: degree days and rain span the grid's own range, rounded outward; temperature
// uses a fixed band so the same colour means the same temperature on every visit.
export function domain(grid: RegionGrid, layer: Layer): [number, number] {
  if (layer === "temp") return [5, 35]
  const vs = grid.cells.flatMap((c) => {
    const v = value(c, layer)
    return v === null ? [] : [v]
  })
  if (vs.length === 0) return [0, 1]
  const step = layer === "gdd" ? 100 : 5
  const lo = layer === "rain" ? 0 : Math.floor(Math.min(...vs) / step) * step
  const hi = Math.max(Math.ceil(Math.max(...vs) / step) * step, lo + step)
  return [lo, hi]
}

export function cellAt(grid: RegionGrid, lat: number, lng: number): RegionCell | null {
  const r = Math.round((REGION.north - lat) / REGION.step)
  const c = Math.round((lng - REGION.west) / REGION.step)
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null
  return grid.cells[r * COLS + c] ?? null
}

export function RegionLegend({ grid, layer }: { grid: RegionGrid; layer: Layer }) {
  const [lo, hi] = domain(grid, layer)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => lo + (hi - lo) * f)
  const title =
    layer === "gdd"
      ? `Degree days since ${grid.seasonStart.slice(5) === "05-01" ? "1 May" : grid.seasonStart}, wheat model (base 0 °C)`
      : layer === "temp"
        ? "Forecast maximum today, °C"
        : "Forecast rain over the next 7 days, mm"
  return (
    <div>
      <p className="text-xs font-medium">{title}</p>
      <div
        aria-hidden
        className="mt-2 h-2.5 rounded-[2px]"
        style={{ background: layer === "rain" ? RAIN_CSS : RAMP_CSS }}
      />
      <div className="text-muted mt-1 flex justify-between font-mono text-[11px] tabular-nums">
        {ticks.map((t) => (
          <span key={t}>{fmt(t, layer)}</span>
        ))}
      </div>
    </div>
  )
}
