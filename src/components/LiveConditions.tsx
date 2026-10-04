import { useState } from "react"
import type { MessageKey } from "@/lib/i18n/en"
import { dateLocale, useI18n } from "@/lib/i18n/store"
import { rampColor } from "@/lib/public/ramp"
import type { Live, PestSummary, SoilData, WeatherData } from "@/lib/public/landingData"

interface Props {
  site: { lat: number; lng: number; label: string }
  radiusKm: number
  weather: Live<WeatherData>
  soil: Live<SoilData>
  pests: Live<PestSummary[]>
}

const TABS = [
  { id: "weather", label: "public.live.tab.weather" },
  { id: "soil", label: "public.live.tab.soil" },
  { id: "pests", label: "public.live.tab.pests" },
] as const satisfies readonly { id: string; label: MessageKey }[]
type Tab = (typeof TABS)[number]["id"]

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString(dateLocale("en-GB"), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  })

const weekday = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString(dateLocale("en-GB"), {
    weekday: "short",
    timeZone: "UTC",
  })

function Unavailable({ source, reason }: { source: string; reason: string }) {
  const { t } = useI18n()
  return (
    <p className="bg-warn-soft text-warn rounded-md p-4 text-sm">
      {t("public.live.unavailable", { source, reason })}
    </p>
  )
}

function Footnote({ source, href, at }: { source: string; href: string; at: string }) {
  const { t } = useI18n()
  return (
    <p className="text-muted mt-4 text-xs">
      {t("public.live.sourceBefore")}{" "}
      <a className="underline" href={href} rel="noopener noreferrer" target="_blank">
        {source}
      </a>
      {t("public.live.sourceAfter", { time: fmtTime(at) })}
    </p>
  )
}

// Bar colour follows the day's maximum on the same fixed band as the landing map's temperature layer.
const tempColor = (t: number) => rampColor((t - 5) / 30)

function WeatherPanel({ weather }: { weather: Live<WeatherData> }) {
  const { t } = useI18n()
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
          t("public.live.today"),
          today.max !== null && today.min !== null
            ? `${Math.round(today.max)}° / ${Math.round(today.min)}°`
            : t("public.live.na"),
        ],
        [
          t("public.live.rainToday"),
          today.rain !== null ? `${today.rain.toFixed(1)} mm` : t("public.live.na"),
        ],
        [t("public.live.rainDays", { count: days.length }), `${totalRain.toFixed(1)} mm`],
        [t("public.live.wetDays"), String(wetDays)],
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
        aria-label={t("public.live.weatherChart")}
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
                {i === 0 ? t("public.live.today") : weekday(d.date)}
              </text>
            </g>
          )
        })}
        <text x={W} y={base + 12} textAnchor="end" fontSize="9" fill="var(--sky)">
          {t("public.live.rainTallest", { mm: maxRain.toFixed(1) })}
        </text>
      </svg>
      <Footnote source="Open-Meteo forecast" href="https://open-meteo.com" at={weather.fetchedAt} />
    </div>
  )
}

function SoilPanel({ soil }: { soil: Live<SoilData> }) {
  const { t } = useI18n()
  if (!soil.ok) return <Unavailable source="SoilGrids" reason={soil.reason} />
  const { sand, silt, clay, texture, soilType } = soil.data
  const parts = [
    { label: t("public.live.sand"), v: sand, color: "var(--heat)" },
    { label: t("public.live.silt"), v: silt, color: "var(--sky)" },
    { label: t("public.live.clay"), v: clay, color: "var(--brand)" },
  ]
  return (
    <div>
      <p className="eyebrow">{t("public.live.texture")}</p>
      <p className="mt-1 text-3xl font-semibold capitalize">{texture}</p>
      <p className="text-muted text-sm">{t("public.live.soilType", { type: soilType })}</p>
      <div
        className="mt-5 flex h-4 gap-px overflow-hidden rounded-[2px]"
        role="img"
        aria-label={t("public.live.soilChart", {
          sand: sand.toFixed(0),
          silt: silt.toFixed(0),
          clay: clay.toFixed(0),
        })}
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
  const { t } = useI18n()
  if (!pests.ok) return <Unavailable source="GBIF" reason={pests.reason} />
  return (
    <div>
      <p className="text-muted mb-4 text-sm">{t("public.live.pestsLead", { radius: radiusKm })}</p>
      <ul className="border-line grid border-y sm:grid-cols-2">
        {pests.data.map((p, i) => (
          <li
            key={p.pest}
            className={`py-4 sm:pr-6 ${i > 0 ? "border-line border-t sm:border-t-0 sm:border-l sm:pl-6" : ""}`}
          >
            <p className="eyebrow">{t("public.live.pestCrop", { crop: p.crop })}</p>
            <p className="mt-1 font-semibold italic">{p.pest}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {p.records}
              {p.capped ? "+" : ""}{" "}
              <span className="text-muted text-sm font-normal">{t("public.live.records")}</span>
            </p>
            <p className="text-muted text-sm">
              {p.latest
                ? t("public.live.mostRecent", { date: p.latest })
                : t("public.live.noDated")}
            </p>
          </li>
        ))}
      </ul>
      <Footnote source="GBIF" href="https://www.gbif.org" at={pests.fetchedAt} />
    </div>
  )
}

export function LiveConditions({ site, radiusKm, weather, soil, pests }: Props) {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>("weather")
  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted text-sm">
          {site.label} ·{" "}
          <span className="font-mono text-xs tabular-nums">
            {site.lat.toFixed(2)}, {site.lng.toFixed(2)}
          </span>
        </p>
        <div
          role="tablist"
          aria-label={t("public.live.tabsLabel")}
          className="bg-surface-2 flex rounded-md p-1"
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              id={`live-tab-${item.id}`}
              role="tab"
              type="button"
              aria-selected={tab === item.id}
              aria-controls="live-panel"
              onClick={() => setTab(item.id)}
              className={`rounded px-3 py-1.5 text-[0.8125rem] font-medium ${
                tab === item.id ? "bg-action text-action-ink" : "text-muted hover:text-ink"
              }`}
            >
              {t(item.label)}
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel" id="live-panel" aria-labelledby={`live-tab-${tab}`}>
        {tab === "weather" && <WeatherPanel weather={weather} />}
        {tab === "soil" && <SoilPanel soil={soil} />}
        {tab === "pests" && <PestPanel pests={pests} radiusKm={radiusKm} />}
      </div>
    </div>
  )
}
