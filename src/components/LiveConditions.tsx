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

type Sky = "clear" | "cloudy" | "rain"

// Sky condition is derived from the forecast rainfall total only; no other signal is available.
const skyFor = (rain: number | null): Sky =>
  rain !== null && rain >= 1 ? "rain" : rain !== null && rain >= 0.1 ? "cloudy" : "clear"

const SKY_LABEL: Record<Sky, string> = {
  clear: "Dry and clear",
  cloudy: "Light showers possible",
  rain: "Rain expected",
}

function SkyScene({ sky }: { sky: Sky }) {
  const sx = sky === "clear" ? 110 : 76
  const sy = sky === "clear" ? 66 : 54
  return (
    <svg viewBox="0 0 220 150" aria-hidden className="h-auto w-full max-w-[15rem]">
      <defs>
        <radialGradient id="wx-sun" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff6c2" />
          <stop offset="0.45" stopColor="#ffc93c" />
          <stop offset="1" stopColor="#f08a0a" />
        </radialGradient>
        <radialGradient id="wx-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffd45a" stopOpacity="0.65" />
          <stop offset="1" stopColor="#ffd45a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="wx-cloud" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor={sky === "rain" ? "#9db4cc" : "#c9d8e8"} />
        </linearGradient>
        <linearGradient id="wx-drop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fd0ff" />
          <stop offset="1" stopColor="#2f7fd8" />
        </linearGradient>
        <filter id="wx-shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#0b2a4a" floodOpacity="0.35" />
        </filter>
      </defs>
      {sky !== "rain" && (
        <g className={sky === "clear" ? "float" : "drift"}>
          <circle cx={sx} cy={sy} r="62" fill="url(#wx-halo)" className="pulse" />
          {sky === "clear" && (
            <g className="spin" stroke="#ffc93c" strokeWidth="4" strokeLinecap="round">
              {Array.from({ length: 12 }, (_, i) => (
                <line
                  key={i}
                  x1={sx}
                  y1={sy - 42}
                  x2={sx}
                  y2={sy - 50}
                  transform={`rotate(${i * 30} ${sx} ${sy})`}
                />
              ))}
            </g>
          )}
          <circle cx={sx} cy={sy} r="32" fill="url(#wx-sun)" filter="url(#wx-shadow)" />
        </g>
      )}
      {sky !== "clear" && (
        <g filter="url(#wx-shadow)" className="drift">
          <g fill="url(#wx-cloud)">
            <circle cx="90" cy="70" r="26" />
            <circle cx="122" cy="58" r="32" />
            <circle cx="152" cy="74" r="24" />
            <rect x="66" y="72" width="110" height="26" rx="13" />
          </g>
          <ellipse cx="118" cy="52" rx="20" ry="9" fill="#fff" opacity="0.6" />
        </g>
      )}
      {sky !== "clear" &&
        (sky === "rain" ? [80, 96, 112, 128, 144, 160] : [92, 122, 152]).map((x, i) => (
          <path
            key={x}
            className={sky === "rain" ? "raindrop" : "raindrop raindrop-light"}
            style={{ animationDelay: `${(i * 0.37) % 1.4}s` }}
            d={`M${x} 100 q5 9 0 14 q-5 -5 0 -14Z`}
            fill="url(#wx-drop)"
          />
        ))}
    </svg>
  )
}

function WeatherPanel({ weather }: { weather: Live<WeatherData> }) {
  if (!weather.ok) return <Unavailable source="Open-Meteo" />
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
  const sky = skyFor(today?.rain ?? null)
  const wetDays = days.filter((d) => (d.rain ?? 0) >= 1).length
  const totalRain = days.reduce((sum, d) => sum + (d.rain ?? 0), 0)

  const trend = days
    .flatMap((d, i) =>
      d.max !== null && d.min !== null ? [{ x: i * col + col / 2, v: (d.max + d.min) / 2 }] : [],
    )
    .map((m, i) => `${i === 0 ? "M" : "L"}${m.x.toFixed(1)},${y(m.v).toFixed(1)}`)
    .join(" ")

  return (
    <div>
      {today && (
        <div
          className="relative mb-5 grid items-center gap-4 overflow-hidden rounded-2xl p-5 sm:grid-cols-[1fr_auto]"
          style={{
            background:
              "radial-gradient(circle at 85% 0%, #ffd97a55, transparent 45%), linear-gradient(160deg, #3d8fe0, #1b4f9c 60%, #14336b)",
            boxShadow: "0 1px 0 #fff4 inset, 0 18px 32px -14px #0b2a6a99",
            color: "#fff",
          }}
        >
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase opacity-80">
              Today, {SKY_LABEL[sky]}
            </p>
            <p className="mt-1 text-6xl font-semibold tabular-nums drop-shadow">
              {today.max !== null ? `${Math.round(today.max)}°` : "n/a"}
              <span className="ml-2 text-2xl font-normal opacity-75">
                / {today.min !== null ? `${Math.round(today.min)}°` : "n/a"}
              </span>
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              {[
                ["Rain today", today.rain !== null ? `${today.rain.toFixed(1)} mm` : "n/a"],
                ["Forecast rain", `${totalRain.toFixed(1)} mm`],
                ["Wet days", String(wetDays)],
              ].map(([k, v]) => (
                <span
                  key={k}
                  className="rounded-xl px-3 py-1.5 backdrop-blur"
                  style={{ background: "#ffffff22", boxShadow: "0 1px 0 #fff4 inset" }}
                >
                  <span className="opacity-75">{k} </span>
                  <span className="font-semibold tabular-nums">{v}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="mx-auto sm:mx-0">
            <SkyScene sky={sky} />
          </div>
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Daily minimum and maximum temperature and rainfall for the forecast period"
        className="h-auto w-full"
      >
        <defs>
          <linearGradient id="wx-cap" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff8a3d" />
            <stop offset="0.55" stopColor="var(--heat)" />
            <stop offset="1" stopColor="var(--sky)" />
          </linearGradient>
          <linearGradient id="wx-cap-gloss" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.18" />
          </linearGradient>
          <linearGradient id="wx-rain" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7cc4ff" />
            <stop offset="1" stopColor="#2a6fd0" />
          </linearGradient>
          <linearGradient id="wx-today" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--brand-2)" stopOpacity="0.18" />
            <stop offset="1" stopColor="var(--brand-2)" stopOpacity="0" />
          </linearGradient>
          <filter id="wx-cap-shadow" x="-100%" y="-10%" width="300%" height="130%">
            <feDropShadow
              dx="0"
              dy="3"
              stdDeviation="2.5"
              floodColor="#7a3f00"
              floodOpacity="0.35"
            />
          </filter>
        </defs>
        <rect
          x="0"
          y={top - 14}
          width={col}
          height={base - top + 14}
          rx="10"
          fill="url(#wx-today)"
        />
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1="0"
            x2={W}
            y1={top + f * (base - top - 20)}
            y2={top + f * (base - top - 20)}
            stroke="var(--line)"
            strokeDasharray="3 5"
          />
        ))}
        {days.map((d, i) => {
          const cx = i * col + col / 2
          const rainH = ((d.rain ?? 0) / maxRain) * 34
          const capH = d.max !== null && d.min !== null ? Math.max(y(d.min) - y(d.max), 14) : 0
          return (
            <g key={d.date}>
              {rainH > 0.5 && (
                <rect
                  x={cx - 7}
                  y={base + 34 - rainH}
                  width="14"
                  height={rainH}
                  rx="4"
                  fill="url(#wx-rain)"
                >
                  <title>{`${d.rain?.toFixed(1)} mm`}</title>
                </rect>
              )}
              {d.max !== null && d.min !== null && (
                <>
                  <rect
                    x={cx - 7}
                    y={y(d.max)}
                    width="14"
                    height={capH}
                    rx="7"
                    fill="url(#wx-cap)"
                    filter="url(#wx-cap-shadow)"
                  />
                  <rect
                    x={cx - 7}
                    y={y(d.max)}
                    width="14"
                    height={capH}
                    rx="7"
                    fill="url(#wx-cap-gloss)"
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
              <text x={cx} y={H - 4} textAnchor="middle" fontSize="10" fill="var(--muted)">
                {i === 0 ? "Today" : weekday(d.date)}
              </text>
            </g>
          )
        })}
        <path
          d={trend}
          fill="none"
          stroke="var(--ink)"
          strokeOpacity="0.35"
          strokeWidth="1.5"
          strokeDasharray="2 4"
          strokeLinecap="round"
        />
        <text x={W} y={base + 12} textAnchor="end" fontSize="9" fill="var(--sky)">
          Rain, tallest bar {maxRain.toFixed(1)} mm
        </text>
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
        className="mt-5 flex h-5 overflow-hidden rounded-full shadow-[inset_0_2px_4px_rgb(0_0_0/25%)]"
        role="img"
        aria-label={`Sand ${sand.toFixed(0)}%, silt ${silt.toFixed(0)}%, clay ${clay.toFixed(0)}%`}
      >
        {parts.map((p) => (
          <span
            key={p.label}
            style={{
              width: `${p.v}%`,
              background: `linear-gradient(180deg, #fff6, transparent 55%), ${p.color}`,
            }}
          />
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
        Georeferenced records within {radiusKm} km of the farm.
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
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">
            <span aria-hidden className="ping bg-brand relative h-2 w-2 rounded-full" />
            Live
          </Badge>
          <p className="text-muted text-sm">
            {site.label} · {site.lat.toFixed(2)}, {site.lng.toFixed(2)}
          </p>
        </div>
        <div role="tablist" aria-label="Live data" className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              id={`live-tab-${t}`}
              role="tab"
              type="button"
              aria-selected={tab === t}
              aria-controls="live-panel"
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === t
                  ? "from-brand-2 to-brand text-brand-ink bg-gradient-to-b shadow-md"
                  : "text-muted hover:text-ink"
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
