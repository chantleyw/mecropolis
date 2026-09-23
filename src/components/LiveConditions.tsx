import { useState } from "react"
import { rampColor } from "@/lib/public/ramp"
import type { Live, PestSummary, SoilData, WeatherData } from "@/lib/public/landingData"

interface Props {
  site: { lat: number; lng: number; label: string }
  radiusKm: number
  weather: Live<WeatherData>
  soil: Live<SoilData>
  pests: Live<PestSummary[]>
}

const TABS = ["Weather", "Soil", "Pests"] as const
type Tab = (typeof TABS)[number]

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  })

const weekday = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })

function Unavailable({ source, reason }: { source: string; reason: string }) {
  return (
    <p className="bg-warn-soft text-warn rounded-md p-4 text-sm">
      {source} data is unavailable right now ({reason}). Nothing is shown in its place.
    </p>
  )
}

function Footnote({ source, href, at }: { source: string; href: string; at: string }) {
  return (
    <p className="text-muted mt-4 text-xs">
      Source:{" "}
      <a className="underline" href={href} rel="noopener noreferrer" target="_blank">
        {source}
      </a>
      . Retrieved {fmtTime(at)}; refreshed every 30 minutes.
    </p>
  )
}

// Bar colour follows the day's maximum on the same fixed band as the landing map's temperature layer.
const tempColor = (t: number) => rampColor((t - 5) / 30)

function WeatherPanel({ weather }: { weather: Live<WeatherData> }) {
  if (!weather.ok) return <Unavailable source="Open-Meteo" reason={weather.reason} />
  const days = weather.data.days
  const today = days[0]
  const lo = Math.min(...days.map((d) => d.min ?? Infinity))
  const hi = Math.max(...days.map((d) => d.max ?? -Infinity))
  const maxRain = Math.max(...days.map((d) => d.rain ?? 0), 1)
  const W = 640
  const H = 230
  const top = 26
  const base = 170
  const col = W / days.length
  const y = (v: number) => top + (1 - (v - lo) / Math.max(hi - lo, 1)) * (base - top - 20)
  const wetDays = days.filter((d) => (d.rain ?? 0) >= 1).length
  const totalRain = days.reduce((sum, d) => sum + (d.rain ?? 0), 0)
  const readings: [string, string][] = today
    ? [
        [
          "Today",
          today.max !== null && today.min !== null
            ? `${Math.round(today.max)}° / ${Math.round(today.min)}°`
            : "n/a",
        ],
        ["Rain today", today.rain !== null ? `${today.rain.toFixed(1)} mm` : "n/a"],
        [`Rain, ${days.length} days`, `${totalRain.toFixed(1)} mm`],
        ["Wet days", String(wetDays)],
      ]
    : []

  return (
    <div>
      {readings.length > 0 && (
        <dl className="border-line mb-6 grid grid-cols-2 border-y sm:grid-cols-4">
          {readings.map(([k, v], i) => (
            <div
              key={k}
              className={`py-3 pr-4 ${i > 0 ? "sm:border-line sm:border-l sm:pl-4" : ""}`}
            >
              <dt className="eyebrow">{k}</dt>
              <dd className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Daily minimum and maximum temperature and rainfall for the forecast period"
        className="h-auto w-full"
      >
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1="0"
            x2={W}
            y1={top + f * (base - top - 20)}
            y2={top + f * (base - top - 20)}
            stroke="var(--line)"
          />
        ))}
        {days.map((d, i) => {
          const cx = i * col + col / 2
          const rainH = ((d.rain ?? 0) / maxRain) * 34
          const capH = d.max !== null && d.min !== null ? Math.max(y(d.min) - y(d.max), 6) : 0
          return (
            <g key={d.date}>
              {rainH > 0.5 && (
                <rect x={cx - 6} y={base + 34 - rainH} width="12" height={rainH} fill="var(--sky)">
                  <title>{`${d.rain?.toFixed(1)} mm`}</title>
                </rect>
              )}
              {d.max !== null && d.min !== null && (
                <>
                  <rect
                    x={cx - 6}
                    y={y(d.max)}
                    width="12"
                    height={capH}
                    rx="2"
                    fill={tempColor(d.max)}
                  />
                  <text
                    x={cx}
                    y={y(d.max) - 7}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill="var(--ink)"
                  >
                    {Math.round(d.max)}
                  </text>
                  <text
                    x={cx}
                    y={y(d.max) + capH + 13}
                    textAnchor="middle"
                    fontSize="10"
                    fill="var(--muted)"
                  >
                    {Math.round(d.min)}
                  </text>
                </>
              )}
              <text
                x={cx}
                y={H - 4}
                textAnchor="middle"
                fontSize="10"
                fontWeight={i === 0 ? 600 : 400}
                fill={i === 0 ? "var(--ink)" : "var(--muted)"}
              >
                {i === 0 ? "Today" : weekday(d.date)}
              </text>
            </g>
          )
        })}
        <text x={W} y={base + 12} textAnchor="end" fontSize="9" fill="var(--sky)">
          Rain, tallest bar {maxRain.toFixed(1)} mm
        </text>
      </svg>
      <Footnote source="Open-Meteo forecast" href="https://open-meteo.com" at={weather.fetchedAt} />
    </div>
  )
}

function SoilPanel({ soil }: { soil: Live<SoilData> }) {
  if (!soil.ok) return <Unavailable source="SoilGrids" reason={soil.reason} />
  const { sand, silt, clay, texture, soilType } = soil.data
  const parts = [
    { label: "Sand", v: sand, color: "var(--heat)" },
    { label: "Silt", v: silt, color: "var(--sky)" },
    { label: "Clay", v: clay, color: "var(--brand)" },
  ]
  return (
    <div>
      <p className="eyebrow">Texture class, 0 to 5 cm</p>
      <p className="mt-1 text-3xl font-semibold capitalize">{texture}</p>
      <p className="text-muted text-sm">Field soil type: {soilType}</p>
      <div
        className="mt-5 flex h-4 gap-px overflow-hidden rounded-[2px]"
        role="img"
        aria-label={`Sand ${sand.toFixed(0)}%, silt ${silt.toFixed(0)}%, clay ${clay.toFixed(0)}%`}
      >
        {parts.map((p) => (
          <span key={p.label} style={{ width: `${p.v}%`, background: p.color }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-[2px]"
              style={{ background: p.color }}
            />
            {p.label} <span className="tabular-nums">{p.v.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
      <Footnote source="SoilGrids" href="https://soilgrids.org" at={soil.fetchedAt} />
    </div>
  )
}

function PestPanel({ pests, radiusKm }: { pests: Live<PestSummary[]>; radiusKm: number }) {
  if (!pests.ok) return <Unavailable source="GBIF" reason={pests.reason} />
  return (
    <div>
      <p className="text-muted mb-4 text-sm">
        Georeferenced records within {radiusKm} km of the farm.
      </p>
      <ul className="border-line grid border-y sm:grid-cols-2">
        {pests.data.map((p, i) => (
          <li
            key={p.pest}
            className={`py-4 sm:pr-6 ${i > 0 ? "border-line border-t sm:border-t-0 sm:border-l sm:pl-6" : ""}`}
          >
            <p className="eyebrow">{p.crop} pest</p>
            <p className="mt-1 font-semibold italic">{p.pest}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {p.records}
              {p.capped ? "+" : ""} <span className="text-muted text-sm font-normal">records</span>
            </p>
            <p className="text-muted text-sm">
              {p.latest ? `Most recent: ${p.latest}` : "No dated records"}
            </p>
          </li>
        ))}
      </ul>
      <Footnote source="GBIF" href="https://www.gbif.org" at={pests.fetchedAt} />
    </div>
  )
}

export function LiveConditions({ site, radiusKm, weather, soil, pests }: Props) {
  const [tab, setTab] = useState<Tab>("Weather")
  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted text-sm">
          {site.label} ·{" "}
          <span className="font-mono text-xs tabular-nums">
            {site.lat.toFixed(2)}, {site.lng.toFixed(2)}
          </span>
        </p>
        <div role="tablist" aria-label="Live data" className="bg-surface-2 flex rounded-md p-1">
          {TABS.map((t) => (
            <button
              key={t}
              id={`live-tab-${t}`}
              role="tab"
              type="button"
              aria-selected={tab === t}
              aria-controls="live-panel"
              onClick={() => setTab(t)}
              className={`rounded px-3 py-1.5 text-[0.8125rem] font-medium ${
                tab === t ? "bg-action text-action-ink" : "text-muted hover:text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel" id="live-panel" aria-labelledby={`live-tab-${tab}`}>
        {tab === "Weather" && <WeatherPanel weather={weather} />}
        {tab === "Soil" && <SoilPanel soil={soil} />}
        {tab === "Pests" && <PestPanel pests={pests} radiusKm={radiusKm} />}
      </div>
    </div>
  )
}
