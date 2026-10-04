import { Component, lazy, Suspense, useState, type ReactNode } from "react"
import { Link } from "react-router"

import { Badge, StageBadge } from "@/components/ui"
import { LiveConditions } from "@/components/LiveConditions"
import { LivePulse } from "@/components/LivePulse"
import { cellAt, LAYERS, RegionLegend, type Layer } from "@/components/RegionField"
import { YieldPanel } from "@/components/YieldPanel"
import { CROP_MODELS, cropModelFor } from "@/lib/agronomy/cropModel"
import { Failed, Loading } from "@/components/States"
import { api } from "@/lib/api"
import type { MessageKey } from "@/lib/i18n/en"
import { dateLocale, useI18n } from "@/lib/i18n/store"
import type { Landing as LandingData } from "@/lib/public/landingData"
import type { RegionGrid } from "@/lib/public/regionGrid"
import { loadFarmOverview, loadFarms, loadRegionGrid } from "@/lib/sanity/queries"
import { useLive } from "@/lib/sanity/useLive"
import { useAsync } from "@/lib/useAsync"
import { useTitle } from "@/lib/useTitle"
import { STAGES } from "@/lib/workflow/types"

// MapLibre is large; the landing loads it in its own chunk.
const RegionMap = lazy(() => import("@/components/RegionMap"))

// A failed map chunk or a browser without WebGL shows its error here instead of replacing the page.
function MapError({ message }: { message: string }) {
  const { t } = useI18n()
  return (
    <div className="grid h-full place-items-center p-6">
      <p role="alert" className="card text-warn max-w-sm p-4 text-sm">
        {t("public.map.couldNotLoad", { error: message })}
      </p>
    </div>
  )
}

class MapBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (!this.state.error) return this.props.children
    return <MapError message={this.state.error.message} />
  }
}

const STEPS: { title: MessageKey; body: MessageKey }[] = [
  { title: "public.step.1.title", body: "public.step.1.body" },
  { title: "public.step.2.title", body: "public.step.2.body" },
  { title: "public.step.3.title", body: "public.step.3.body" },
]

const HONESTY: { title: MessageKey; body: MessageKey }[] = [
  { title: "public.honesty.1.title", body: "public.honesty.1.body" },
  { title: "public.honesty.2.title", body: "public.honesty.2.body" },
  { title: "public.honesty.3.title", body: "public.honesty.3.body" },
  { title: "public.honesty.4.title", body: "public.honesty.4.body" },
]

// Weather, soil, pests and yields come from functions/api/landing.ts (PSD needs a server key).
// Farms, seasons and the regional grid are read from Sanity directly; the page asks
// functions/api/region.ts to bring the grid up to date and the listener delivers the result.
const fetchLanding = () => api<LandingData>("/api/landing")
const requestRefresh = () =>
  api<{ refreshing: boolean; reason?: string }>("/api/region", { method: "POST", body: {} })
const NO_PARAMS = {}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString(dateLocale("en-GB"), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  })

const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString(dateLocale("en-GB"), {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })

function FarmPanel({ slug, grid }: { slug: string; grid: RegionGrid | null }) {
  const { t } = useI18n()
  const overview = useLive(loadFarmOverview, { slug })
  if (overview.status === "loading") return <Loading what={t("public.what.farm")} />
  if (overview.status === "error")
    return <Failed what={t("public.what.farm")} error={overview.error} />
  const { farm, fields } = overview.data
  if (!farm) return <p className="text-muted p-5 text-sm">{t("public.farm.gone")}</p>
  const cell =
    grid && farm.coordinates?.lat != null && farm.coordinates.lng != null
      ? cellAt(grid, farm.coordinates.lat, farm.coordinates.lng)
      : null

  return (
    <div>
      <div className="border-line flex items-start justify-between gap-3 border-b px-5 pt-4 pb-3">
        <div>
          <h2 className="font-semibold">{farm.name}</h2>
          {farm.location && <p className="text-muted text-xs">{farm.location}</p>}
        </div>
        <LivePulse live={overview.live} />
      </div>
      {cell?.gdd != null && grid && (
        <p className="border-line text-muted border-b px-5 py-2.5 text-xs">
          {t("public.farm.gridPointBefore")}{" "}
          <span className="text-ink font-mono tabular-nums">
            {Math.round(cell.gdd).toLocaleString(dateLocale("en-US"))}
          </span>{" "}
          {t("public.farm.gridPointAfter")}
        </p>
      )}
      <ul>
        {fields.map((f) => {
          const s = f.seasons[0]
          const model = s ? cropModelFor(s.gddModelKey ?? s.cropName ?? "") : null
          const lc = s?.lastChange
          const evidence = [
            lc?.effectiveDate
              ? lc.gddTotal != null
                ? t("public.farm.sinceAt", {
                    date: fmtDay(lc.effectiveDate),
                    gdd: Math.round(lc.gddTotal).toLocaleString(dateLocale("en-US")),
                  })
                : t("public.farm.since", { date: fmtDay(lc.effectiveDate) })
              : null,
            model
              ? t("public.farm.maturityAt", {
                  gdd: model.gddToMaturity.toLocaleString(dateLocale("en-US")),
                })
              : null,
          ].filter(Boolean)
          return (
            <li
              key={f._id}
              className="border-line grid grid-cols-[1fr_auto] items-center gap-x-3 border-b px-5 py-2.5 text-sm last:border-b-0"
            >
              <span>
                <span className="font-medium">{f.name}</span>
                <span className="text-muted block text-xs">
                  {s
                    ? `${s.cropName ?? t("public.farm.cropNotSet")} ${s.year}`
                    : t("public.farm.noSeason")}
                </span>
                {evidence.length > 0 && (
                  <span className="text-muted mt-0.5 block font-mono text-[0.6875rem] tabular-nums">
                    {evidence.join(" · ")}
                  </span>
                )}
              </span>
              {s?.stage ? <StageBadge stage={s.stage} /> : null}
            </li>
          )
        })}
      </ul>
      <p className="text-muted px-5 pt-2 pb-4 text-xs">
        {t("public.farm.footLive")} {grid && t("public.farm.footGrid", { date: grid.throughDate })}
      </p>
    </div>
  )
}

function Hero() {
  const { t } = useI18n()
  const region = useLive(loadRegionGrid, NO_PARAMS)
  const refresh = useAsync(requestRefresh, NO_PARAMS)
  const farms = useLive(loadFarms, NO_PARAMS)
  const [layer, setLayer] = useState<Layer>("gdd")
  const [picked, setPicked] = useState<string | null>(null)
  const pins =
    farms.status === "ready"
      ? farms.data.flatMap((f) =>
          f.coordinates?.lat != null && f.coordinates.lng != null
            ? [{ slug: f.slug, name: f.name, lat: f.coordinates.lat, lng: f.coordinates.lng }]
            : [],
        )
      : []
  const selected =
    picked ?? pins.find((p) => p.name.startsWith("Swartland"))?.slug ?? pins[0]?.slug ?? null
  const stored = region.status === "ready" ? region.data : null
  const grid = stored && stored.cells.length > 0 ? stored : null
  // Inside the layer card from md; under the map on phones, where the card is kept compact.
  const gridNotes = grid && (
    <>
      <p className="text-muted mt-3 text-xs">
        {grid.forecastAt
          ? t("public.map.gridNotesForecast", {
              count: grid.cells.filter((c) => c.land).length,
              date: grid.throughDate,
              time: fmtTime(grid.forecastAt),
            })
          : t("public.map.gridNotes", {
              count: grid.cells.filter((c) => c.land).length,
              date: grid.throughDate,
            })}{" "}
        {t("public.map.modelNote")}
      </p>
      {grid.lastError && (
        <p role="alert" className="text-warn mt-2 text-xs">
          {t("public.map.lastRefreshFailed", { error: grid.lastError })}
        </p>
      )}
      {refresh.status === "error" && (
        <p role="alert" className="text-warn mt-2 text-xs">
          {t("public.map.refreshRequestFailed", { error: refresh.error.message })}
        </p>
      )}
    </>
  )

  // Phones: map first, then the grid note, the hero text and the farm panel. From md the panels
  // float over a full-height map.
  return (
    <section
      aria-labelledby="hero-title"
      className="relative flex flex-col overflow-hidden bg-[var(--sea)] md:block md:h-[calc(100svh-3.5rem)] md:min-h-[42rem]"
    >
      <div
        data-map-cover
        className="card relative z-10 order-3 m-4 p-6 sm:p-7 md:absolute md:top-6 md:left-6 md:m-0 md:w-[27rem]"
      >
        <h1
          id="hero-title"
          className="text-[2rem] leading-[1.04] font-semibold tracking-[-0.03em] text-balance sm:text-[2.5rem]"
        >
          {t("public.hero.title")}
        </h1>
        <p className="text-muted mt-4 text-[0.9375rem] leading-relaxed text-pretty">
          {t("public.hero.intro")}
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Link to="/dashboard" className="btn btn-primary !px-4 !py-2.5">
            {t("public.hero.openDashboard")}
          </Link>
          <a href="#how" className="btn !px-4 !py-2.5">
            {t("nav.howItWorks")}
          </a>
        </div>
      </div>

      <div className="relative order-1 h-[62svh] md:absolute md:inset-0 md:h-auto">
        {grid ? (
          <MapBoundary>
            <Suspense
              fallback={
                <div className="grid h-full place-items-center p-6">
                  <p className="card text-muted max-w-sm p-4 text-sm" role="status">
                    {t("public.map.loading")}
                  </p>
                </div>
              }
            >
              <RegionMap
                grid={grid}
                layer={layer}
                pins={pins}
                selected={selected}
                onSelect={setPicked}
              />
            </Suspense>
          </MapBoundary>
        ) : region.status === "error" ? (
          <div className="grid h-full place-items-center p-6">
            <p role="alert" className="card text-warn max-w-sm p-4 text-sm">
              {t("public.map.gridReadFailed", { error: region.error.message })}
            </p>
          </div>
        ) : (
          <div className="grid h-full place-items-center p-6">
            <p className="card text-muted max-w-sm p-4 text-sm" role="status">
              {region.status === "loading"
                ? t("public.map.gridLoading")
                : stored?.lastError
                  ? t("public.map.firstRefreshFailed", { error: stored.lastError })
                  : t("public.map.gridFetching")}
            </p>
          </div>
        )}

        {/* Bottom left with its switcher so the legend sits beside the layer it describes; the
            bottom right holds the map's zoom and attribution. */}
        {grid && (
          <div
            data-map-cover
            className="card absolute right-3 bottom-3 left-3 z-10 p-3 md:right-auto md:bottom-6 md:left-6 md:w-[27rem] md:p-4"
          >
            <div
              role="group"
              aria-label={t("public.map.layerGroup")}
              className="bg-surface-2 flex rounded-md p-1"
            >
              {LAYERS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  aria-pressed={layer === l.id}
                  onClick={() => setLayer(l.id)}
                  className={`flex-auto rounded px-2 py-1.5 text-xs font-medium whitespace-nowrap md:flex-1 md:text-[0.8125rem] ${
                    layer === l.id ? "bg-action text-action-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  {t(l.label)}
                </button>
              ))}
            </div>
            <div className="mt-3 md:mt-4">
              <RegionLegend grid={grid} layer={layer} />
            </div>
            <div className="hidden md:block">{gridNotes}</div>
          </div>
        )}
      </div>

      {grid && <div className="order-2 mx-4 mt-3 md:hidden">{gridNotes}</div>}

      {selected && (
        <div
          data-map-cover
          className="card relative z-10 order-4 m-4 md:absolute md:top-6 md:right-6 md:m-0 md:w-[22rem]"
        >
          <FarmPanel slug={selected} grid={grid} />
        </div>
      )}
    </section>
  )
}

export function Landing() {
  const { t } = useI18n()
  useTitle(null)
  const landing = useAsync(fetchLanding, NO_PARAMS)
  const models = Object.entries(CROP_MODELS)
  const maxGdd = Math.max(...models.map(([, m]) => m.gddToMaturity))

  return (
    <main>
      <Hero />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <section
          id="how"
          aria-labelledby="how-title"
          className="grid scroll-mt-20 gap-10 pt-24 lg:grid-cols-[1fr_1.2fr]"
        >
          <div>
            <h2 id="how-title" className="text-3xl font-semibold tracking-tight text-balance">
              {t("public.how.title")}
            </h2>
            <p className="text-muted mt-4 max-w-md text-pretty">{t("public.how.lead")}</p>
            <ol aria-label={t("public.how.stagesLabel")} className="mt-8 flex flex-wrap gap-1.5">
              {STAGES.map((s) => (
                <li key={s}>
                  <StageBadge stage={s} />
                </li>
              ))}
            </ol>
          </div>
          <ol className="border-line border-t">
            {STEPS.map((s, i) => (
              <li key={s.title} className="border-line grid grid-cols-[2.5rem_1fr] border-b py-5">
                <span className="text-muted font-mono text-sm tabular-nums">{i + 1}</span>
                <div>
                  <h3 className="font-semibold">{t(s.title)}</h3>
                  <p className="text-muted mt-1.5 text-sm leading-relaxed">{t(s.body)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="models" className="pt-24">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="models" className="text-2xl font-semibold tracking-tight">
              {t("public.models.title")}
            </h2>
            <Badge tone="warn">{t("public.models.badge")}</Badge>
          </div>
          <p className="text-muted mt-2 text-sm">{t("public.models.lead")}</p>
          <ul className="border-line mt-6 border-t">
            {models.map(([name, m]) => (
              <li
                key={name}
                className="border-line grid grid-cols-[9rem_1fr] items-center gap-4 border-b py-3 text-sm sm:grid-cols-[12rem_1fr_11rem]"
              >
                <span className="font-medium capitalize">{name}</span>
                <span className="bg-surface-2 block h-3 overflow-hidden rounded-[2px]">
                  <span
                    className="bar-fill block h-3"
                    style={{
                      width: `${(m.gddToMaturity / maxGdd) * 100}%`,
                      background: "var(--ink)",
                    }}
                  />
                </span>
                <span className="text-muted col-span-2 font-mono text-xs tabular-nums sm:col-span-1 sm:text-right">
                  {t("public.models.row", {
                    temp: m.baseTempC,
                    gdd: m.gddToMaturity.toLocaleString(dateLocale("en-US")),
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="live" className="pt-24">
          <h2 id="live" className="text-2xl font-semibold tracking-tight">
            {t("public.live.title")}
          </h2>
          <p className="text-muted mt-2 text-sm">{t("public.live.lead")}</p>
          <div className="mt-6">
            {landing.status === "ready" ? (
              <LiveConditions
                site={landing.data.site}
                radiusKm={landing.data.radiusKm}
                weather={landing.data.weather}
                soil={landing.data.soil}
                pests={landing.data.pests}
              />
            ) : landing.status === "error" ? (
              <Failed what={t("public.what.liveConditions")} error={landing.error} />
            ) : (
              <Loading what={t("public.what.liveConditions")} />
            )}
          </div>
        </section>

        <section aria-labelledby="yields" className="pt-24">
          <h2 id="yields" className="text-2xl font-semibold tracking-tight">
            {t("public.yields.title")}
          </h2>
          <div className="mt-4">
            {landing.status === "ready" ? (
              <YieldPanel yields={landing.data.yields} />
            ) : landing.status === "error" ? (
              <Failed what={t("public.what.yieldStats")} error={landing.error} />
            ) : (
              <Loading what={t("public.what.yieldStats")} />
            )}
          </div>
        </section>

        <section aria-labelledby="honesty" className="pt-24">
          <h2 id="honesty" className="text-2xl font-semibold tracking-tight">
            {t("public.honesty.title")}
          </h2>
          <dl className="border-line mt-6 grid border-t sm:grid-cols-2 sm:gap-x-10">
            {HONESTY.map((h) => (
              <div key={h.title} className="border-line border-b py-5">
                <dt className="font-semibold">{t(h.title)}</dt>
                <dd className="text-muted mt-1.5 text-sm leading-relaxed">{t(h.body)}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section
          aria-labelledby="open"
          className="card my-24 flex flex-wrap items-end justify-between gap-6 p-6 sm:p-8"
        >
          <div>
            <h2 id="open" className="text-2xl font-semibold tracking-tight">
              {t("public.open.title")}
            </h2>
            <p className="text-muted mt-2 max-w-xl text-sm">{t("public.open.body")}</p>
          </div>
          <Link to="/dashboard" className="btn btn-primary !px-4 !py-2.5">
            {t("public.hero.openDashboard")}
          </Link>
        </section>
      </div>
    </main>
  )
}
