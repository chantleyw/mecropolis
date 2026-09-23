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
import type { Landing as LandingData } from "@/lib/public/landingData"
import { REGION_GRID_ID, type RegionGrid } from "@/lib/public/regionGrid"
import { loadFarmOverview, loadFarms, loadRegionGrid } from "@/lib/sanity/queries"
import { useLive } from "@/lib/sanity/useLive"
import { useAsync } from "@/lib/useAsync"
import { useTitle } from "@/lib/useTitle"
import { STAGES } from "@/lib/workflow/types"

// MapLibre is large; the landing loads it in its own chunk.
const RegionMap = lazy(() => import("@/components/RegionMap"))

// A failed map chunk or a browser without WebGL shows its error here instead of replacing the page.
class MapBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid h-full place-items-center p-6">
        <p role="alert" className="card text-warn max-w-sm p-4 text-sm">
          The map could not load ({this.state.error.message}).
        </p>
      </div>
    )
  }
}

const STEPS = [
  {
    title: "Record what the farmer knows",
    body: "Farms, fields, crops and planting dates are stored in Sanity.",
  },
  {
    title: "Fetch the weather that happened",
    body: "Daily temperatures for the field's coordinates come from the Open-Meteo archive, from planting to today.",
  },
  {
    title: "Accumulate degree days",
    body: "Growing degree days (GDD) are summed against the crop model. When a threshold is crossed, the reconciler moves the season to the next stage and records the basis.",
  },
]

const HONESTY = [
  {
    title: "Yield is entered by the operator",
    body: "Until an operator records a yield, the app shows “Not recorded”.",
  },
  {
    title: "Benchmarks are separate records",
    body: "Regional and national statistics are stored in their own documents with source and unit. They are not compared with a field's yield.",
  },
  {
    title: "Pest records are regional",
    body: "GBIF occurrence records are shown as sightings within 100 km, with the distance.",
  },
  {
    title: "Weather is live",
    body: "Temperatures are fetched from the Open-Meteo archive at request time.",
  },
]

// Weather, soil, pests and yields come from functions/api/landing.ts (PSD needs a server key).
// Farms, seasons and the regional grid are read from Sanity directly; the page asks
// functions/api/region.ts to bring the grid up to date and the listener delivers the result.
const fetchLanding = () => api<LandingData>("/api/landing")
const requestRefresh = () =>
  api<{ refreshing: boolean; reason?: string }>("/api/region", { method: "POST", body: {} })
const REGION_DOC = `*[_id == "${REGION_GRID_ID}"]`
const NO_PARAMS = {}
const FARM_DOCS = `*[_type in ["farm", "field", "season"]]`

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  })

const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })

function FarmPanel({ slug, grid }: { slug: string; grid: RegionGrid | null }) {
  const overview = useLive(loadFarmOverview, { slug }, FARM_DOCS)
  if (overview.status === "loading") return <Loading what="farm" />
  if (overview.status === "error") return <Failed what="farm" error={overview.error} />
  const { farm, fields } = overview.data
  if (!farm) return <p className="text-muted p-5 text-sm">This farm is no longer in the dataset.</p>
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
          Grid point at this farm:{" "}
          <span className="text-ink font-mono tabular-nums">
            {Math.round(cell.gdd).toLocaleString("en-US")}
          </span>{" "}
          degree days since 1 May (wheat, base 0 °C). Regional context, not a season total.
        </p>
      )}
      <ul>
        {fields.map((f) => {
          const s = f.seasons[0]
          const model = s ? cropModelFor(s.gddModelKey ?? s.cropName ?? "") : null
          const lc = s?.lastChange
          const evidence = [
            lc?.effectiveDate
              ? `since ${fmtDay(lc.effectiveDate)}${lc.gddTotal != null ? ` at ${Math.round(lc.gddTotal).toLocaleString("en-US")} GDD` : ""}`
              : null,
            model ? `maturity at ${model.gddToMaturity.toLocaleString("en-US")} GDD` : null,
          ].filter(Boolean)
          return (
            <li
              key={f._id}
              className="border-line grid grid-cols-[1fr_auto] items-center gap-x-3 border-b px-5 py-2.5 text-sm last:border-b-0"
            >
              <span>
                <span className="font-medium">{f.name}</span>
                <span className="text-muted block text-xs">
                  {s ? `${s.cropName ?? "Crop not set"} ${s.year}` : "No season recorded"}
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
        Fields, stages and the GDD recorded at each stage change from Sanity, updated live.{" "}
        {grid && `Degree days from the Open-Meteo archive to ${grid.throughDate}.`}
      </p>
    </div>
  )
}

function Hero() {
  const region = useLive(loadRegionGrid, NO_PARAMS, REGION_DOC)
  const refresh = useAsync(requestRefresh, NO_PARAMS)
  const farms = useLive(loadFarms, NO_PARAMS, `*[_type == "farm"]`)
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

  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden bg-[var(--sea)] md:h-[calc(100svh-3.5rem)] md:min-h-[42rem]"
    >
      <div className="card relative z-10 m-4 p-6 sm:p-7 md:absolute md:top-6 md:left-6 md:m-0 md:w-[27rem]">
        <h1
          id="hero-title"
          className="text-[2rem] leading-[1.04] font-semibold tracking-[-0.03em] text-balance sm:text-[2.5rem]"
        >
          Crop stage, calculated from the weather that happened
        </h1>
        <p className="text-muted mt-4 text-[0.9375rem] leading-relaxed text-pretty">
          Mecropolis sums growing degree days from recorded Open-Meteo temperatures since planting,
          and moves each Western Cape season to its next stage when the total crosses the crop's
          threshold.
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Link to="/dashboard" className="btn btn-primary !px-4 !py-2.5">
            Open the dashboard
          </Link>
          <a href="#how" className="btn !px-4 !py-2.5">
            How it works
          </a>
        </div>
      </div>

      <div className="relative mx-4 aspect-[4/3] md:absolute md:inset-0 md:mx-0 md:aspect-auto">
        {grid ? (
          <MapBoundary>
            <Suspense
              fallback={
                <div className="grid h-full place-items-center p-6">
                  <p className="card text-muted max-w-sm p-4 text-sm" role="status">
                    Loading the map…
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
              The regional grid could not be read from Sanity ({region.error.message}). Nothing is
              drawn in its place.
            </p>
          </div>
        ) : (
          <div className="grid h-full place-items-center p-6">
            <p className="card text-muted max-w-sm p-4 text-sm" role="status">
              {region.status === "loading"
                ? "Loading the regional grid…"
                : stored?.lastError
                  ? `The first Open-Meteo refresh failed (${stored.lastError}). Nothing is drawn in its place.`
                  : "The grid is being fetched from Open-Meteo for the first time. It appears here when the refresh finishes."}
            </p>
          </div>
        )}
      </div>

      {selected && (
        <div className="card relative z-10 m-4 md:absolute md:top-6 md:right-6 md:m-0 md:w-[22rem]">
          <FarmPanel slug={selected} grid={grid} />
        </div>
      )}

      {grid && (
        <div className="card relative z-10 m-4 p-4 md:absolute md:bottom-6 md:left-6 md:m-0 md:w-[27rem]">
          <div role="group" aria-label="Map layer" className="bg-surface-2 flex rounded-md p-1">
            {LAYERS.map((l) => (
              <button
                key={l.id}
                type="button"
                aria-pressed={layer === l.id}
                onClick={() => setLayer(l.id)}
                className={`flex-1 rounded px-2 py-1.5 text-[0.8125rem] font-medium ${
                  layer === l.id ? "bg-action text-action-ink" : "text-muted hover:text-ink"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <RegionLegend grid={grid} layer={layer} />
          </div>
          <p className="text-muted mt-3 text-xs">
            {grid.cells.filter((c) => c.land).length} Open-Meteo grid points at 0.25°, one cell
            each, not interpolated. Degree days to {grid.throughDate}
            {grid.forecastAt ? `; forecast retrieved ${fmtTime(grid.forecastAt)}` : ""}. Model
            parameters are hand-authored and not validated.
          </p>
          {grid.lastError && (
            <p role="alert" className="text-warn mt-2 text-xs">
              Last refresh failed: {grid.lastError}. Showing the last stored grid.
            </p>
          )}
          {refresh.status === "error" && (
            <p role="alert" className="text-warn mt-2 text-xs">
              Refresh request failed: {refresh.error.message}. Showing the last stored grid.
            </p>
          )}
        </div>
      )}
    </section>
  )
}

export function Landing() {
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
              From planting date to stage
            </h2>
            <p className="text-muted mt-4 max-w-md text-pretty">
              Stage is usually entered by hand and is only as current as the last update. Here it is
              derived from recorded weather, and every change stores its evidence.
            </p>
            <ol aria-label="Season stages" className="mt-8 flex flex-wrap gap-1.5">
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
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="text-muted mt-1.5 text-sm leading-relaxed">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="models" className="pt-24">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="models" className="text-2xl font-semibold tracking-tight">
              Crop models in use
            </h2>
            <Badge tone="warn">Not validated</Badge>
          </div>
          <p className="text-muted mt-2 text-sm">
            Degree days needed to reach thermal maturity. These parameters are hand-authored and
            have no citations yet.
          </p>
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
                  base {m.baseTempC} °C · {m.gddToMaturity.toLocaleString("en-US")} GDD
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="live" className="pt-24">
          <h2 id="live" className="text-2xl font-semibold tracking-tight">
            Conditions at the Swartland demo farm
          </h2>
          <p className="text-muted mt-2 text-sm">
            Readings from public sources, refreshed every 30 minutes.
          </p>
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
              <Failed what="live conditions" error={landing.error} />
            ) : (
              <Loading what="live conditions" />
            )}
          </div>
        </section>

        <section aria-labelledby="yields" className="pt-24">
          <h2 id="yields" className="text-2xl font-semibold tracking-tight">
            Published yield benchmarks
          </h2>
          <div className="mt-4">
            {landing.status === "ready" ? (
              <YieldPanel yields={landing.data.yields} />
            ) : landing.status === "error" ? (
              <Failed what="yield statistics" error={landing.error} />
            ) : (
              <Loading what="yield statistics" />
            )}
          </div>
        </section>

        <section aria-labelledby="honesty" className="pt-24">
          <h2 id="honesty" className="text-2xl font-semibold tracking-tight">
            How data is handled
          </h2>
          <dl className="border-line mt-6 grid border-t sm:grid-cols-2 sm:gap-x-10">
            {HONESTY.map((h) => (
              <div key={h.title} className="border-line border-b py-5">
                <dt className="font-semibold">{h.title}</dt>
                <dd className="text-muted mt-1.5 text-sm leading-relaxed">{h.body}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section
        aria-labelledby="open"
        className="bg-action text-action-ink mt-24 px-4 py-16 sm:px-6"
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6">
          <div>
            <h2 id="open" className="text-3xl font-semibold tracking-tight">
              Open a season
            </h2>
            <p className="mt-2 max-w-xl opacity-75">
              Sign in to the demo dashboard to view a season&apos;s GDD curve and the evidence
              behind its stage.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="btn !border-action-ink !bg-action-ink !text-action !px-5 !py-2.5"
          >
            Open the dashboard
          </Link>
        </div>
      </section>
    </main>
  )
}
