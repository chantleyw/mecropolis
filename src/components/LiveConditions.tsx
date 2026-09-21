"use client"

import { useState } from "react"
import { Badge } from "@/components/ui"
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

function Unavailable({ source }: { source: string }) {
  return (
    <p className="bg-warn-soft text-warn rounded-lg p-4 text-sm">
      {source} data is unavailable right now. Nothing is shown in its place.
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

function WeatherPanel({ weather }: { weather: Live<WeatherData> }) {
  if (!weather.ok) return <Unavailable source="Open-Meteo" />
  const days = weather.data.days
  const today = days[0]
  const lo = Math.min(...days.map((d) => d.min ?? Infinity))
  const hi = Math.max(...days.map((d) => d.max ?? -Infinity))
  const W = 560
  const H = 150
  const col = W / days.length
  const y = (v: number) => 12 + (1 - (v - lo) / Math.max(hi - lo, 1)) * (H - 40)

  return (
    <div>
      {today && (
        <div className="mb-5 flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <p className="eyebrow">Today high</p>
            <p className="text-3xl font-semibold tabular-nums">
              {today.max !== null ? `${Math.round(today.max)}°C` : "n/a"}
            </p>
          </div>
          <div>
            <p className="eyebrow">Today low</p>
            <p className="text-3xl font-semibold tabular-nums">
              {today.min !== null ? `${Math.round(today.min)}°C` : "n/a"}
            </p>
          </div>
          <div>
            <p className="eyebrow">Rain today</p>
            <p className="text-3xl font-semibold tabular-nums">
              {today.rain !== null ? `${today.rain.toFixed(1)} mm` : "n/a"}
            </p>
          </div>
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Daily minimum and maximum temperature for the next 14 days"
        className="h-auto w-full"
      >
        {days.map((d, i) => {
          if (d.max === null || d.min === null) return null
          const cx = i * col + col / 2
          return (
            <g key={d.date}>
              <line
                x1={cx}
                x2={cx}
                y1={y(d.max)}
                y2={y(d.min)}
                stroke="var(--heat)"
                strokeWidth="8"
                strokeLinecap="round"
                opacity="0.85"
              />
              <text x={cx} y={y(d.max) - 6} textAnchor="middle" fontSize="9" fill="var(--muted)">
                {Math.round(d.max)}
              </text>
              <text x={cx} y={y(d.min) + 15} textAnchor="middle" fontSize="9" fill="var(--muted)">
                {Math.round(d.min)}
              </text>
              <text x={cx} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--muted)">
                {weekday(d.date)}
              </text>
            </g>
          )
        })}
      </svg>
      <Footnote source="Open-Meteo forecast" href="https://open-meteo.com" at={weather.fetchedAt} />
    </div>
  )
}

function SoilPanel({ soil }: { soil: Live<SoilData> }) {
  if (!soil.ok) return <Unavailable source="SoilGrids" />
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
        className="mt-5 flex h-4 overflow-hidden rounded-full"
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
              className="h-2.5 w-2.5 rounded-full"
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
  if (!pests.ok) return <Unavailable source="GBIF" />
  return (
    <div>
      <p className="text-muted mb-4 text-sm">
        Georeferenced records within {radiusKm} km. They show a species was recorded nearby, not
        that it is on any field.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {pests.data.map((p) => (
          <li key={p.pest} className="border-line bg-surface-2 rounded-xl border p-4">
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
        <div>
          <h3 className="text-base font-semibold">Live conditions</h3>
          <p className="text-muted text-sm">
            {site.label} · {site.lat}, {site.lng}
          </p>
        </div>
        <div role="tablist" aria-label="Live data" className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === t ? "bg-brand text-brand-ink" : "text-muted hover:text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <Badge tone="brand">Live</Badge>
      <div role="tabpanel" className="mt-4">
        {tab === "Weather" && <WeatherPanel weather={weather} />}
        {tab === "Soil" && <SoilPanel soil={soil} />}
        {tab === "Pests" && <PestPanel pests={pests} radiusKm={radiusKm} />}
      </div>
    </div>
  )
}
