import { useEffect } from "react"
import { Link, useParams } from "react-router"

import { ActivityFeed } from "@/components/ActivityFeed"
import { AlertsPanel } from "@/components/AlertsPanel"
import { CollapsibleSection } from "@/components/CollapsibleSection"
import { FieldExplorer } from "@/components/FieldExplorer"
import { LiveConditions } from "@/components/LiveConditions"
import { LivePulse } from "@/components/LivePulse"
import { RecommendationQueue } from "@/components/RecommendationQueue"
import { SeasonBoard } from "@/components/SeasonBoard"
import { Failed, Loading, NotFound } from "@/components/States"
import { STAGE_LABEL, Stat } from "@/components/ui"
import { api } from "@/lib/api"
import { buildAlerts } from "@/lib/dashboard/alerts"
import { curveOf, toBoardResult, type BoardSeason } from "@/lib/dashboard/board"
import { rememberFarm } from "@/lib/dashboard/farmChoice"
import { loadSeasonProgress, type ProgressInput } from "@/lib/dashboard/progress"
import { summarise } from "@/lib/dashboard/summary"
import type { SiteConditions } from "@/lib/public/landingData"
import {
  loadFarmOverview,
  loadRecentActivity,
  loadRecommendations,
  type FarmOverview,
} from "@/lib/sanity/queries"
import { useLive } from "@/lib/sanity/useLive"
import { useAsync } from "@/lib/useAsync"
import { useTitle } from "@/lib/useTitle"

const MATURE_STAGES = ["harvested", "review"]
// One listener for everything the dashboard shows; any change reloads the affected loaders.
const FARM_DOCS = `*[_type in ["farm", "field", "season", "pestReport", "agronomyRecommendation"]]`

// Weather and soil come from a Function (SoilGrids and GBIF are fetched server-side); GDD
// progress is computed in the browser from the Open-Meteo archive.
const fetchConditions = (slug: string) =>
  api<SiteConditions>(`/api/conditions?farm=${encodeURIComponent(slug)}`)
const fetchProgress = (inputs: ProgressInput[]) => Promise.all(inputs.map(loadSeasonProgress))

export function FarmDashboard() {
  const slug = useParams().farm ?? ""
  const overview = useLive(loadFarmOverview, { slug }, FARM_DOCS)
  const farm = overview.status === "ready" ? overview.data.farm : null
  useTitle(farm?.name ?? "Dashboard")

  useEffect(() => {
    if (farm) rememberFarm(farm.slug)
  }, [farm])

  if (overview.status === "loading") return <Loading what="the farm" />
  if (overview.status === "error") {
    return (
      <main className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <Failed what="the farm" error={overview.error} />
      </main>
    )
  }
  if (!overview.data.farm) return <NotFound what="farm" />
  const { farm: found, fields } = overview.data
  return <Dashboard slug={slug} overview={{ farm: found, fields }} live={overview.live} />
}

function Dashboard({
  slug,
  overview,
  live,
}: {
  slug: string
  overview: FarmOverview & { farm: NonNullable<FarmOverview["farm"]> }
  live: boolean
}) {
  const { farm, fields } = overview
  const activityState = useLive(loadRecentActivity, { slug }, FARM_DOCS)
  const recommendationState = useLive(loadRecommendations, { slug }, FARM_DOCS)

  const summary = summarise(fields)
  const seasons = fields.flatMap((f) => f.seasons.map((s) => ({ ...s, field: f })))
  const active = seasons.filter((s) => s.stage !== "review")
  const matured = seasons.filter((s) => MATURE_STAGES.includes(s.stage ?? "")).length

  const { lat, lng } = farm.coordinates ?? {}
  const site =
    lat != null && lng != null ? { lat, lng, label: farm.location ?? "Farm location" } : null

  const conditionsState = useAsync(fetchConditions, site ? slug : null)
  const progressState = useAsync(
    fetchProgress,
    active.map((s) => ({
      lat: s.field.coordinates?.lat,
      lng: s.field.coordinates?.lng,
      cropName: s.gddModelKey ?? s.cropName,
      plantingDate: s.plantingDate,
      growthCycleDays: s.growthCycleDays,
    })),
  )
  const conditions = conditionsState.status === "ready" ? conditionsState.data : null
  const results = progressState.status === "ready" ? progressState.data : null

  // Zipped into one object per season so sorting and filtering cannot misalign results.
  const board: BoardSeason[] = results
    ? active.map((s, i) => {
        const result = results[i] ?? ({ status: "error", reason: "No result" } as const)
        return {
          id: s._id,
          cropName: s.cropName,
          year: s.year,
          fieldId: s.field._id,
          fieldName: s.field.name,
          colour: s.field.colour,
          photo: s.field.photo,
          stage: s.stage,
          plantingDate: s.plantingDate,
          expectedHarvest: s.expectedHarvest,
          pestCount: s.pestCount,
          result: toBoardResult(result),
          curve: curveOf(result),
        }
      })
    : []

  const todayIso = new Date().toISOString().slice(0, 10)
  const alerts = buildAlerts(
    board.map((b) => ({
      id: b.id,
      label: `${b.cropName ?? "Unknown crop"} ${b.year}`,
      fieldName: b.fieldName,
      stage: b.stage,
      plantingDate: b.plantingDate,
      pestCount: b.pestCount,
      result:
        b.result.status === "ok"
          ? { status: "ok", progress: { ...b.result, running: [] } }
          : b.result.status === "error"
            ? { status: "error", reason: "Weather fetch failed" }
            : b.result,
    })),
    conditions?.weather.ok ? conditions.weather.data.days : null,
    todayIso,
  )

  const activity = activityState.status === "ready" ? activityState.data : []
  const recommendations = recommendationState.status === "ready" ? recommendationState.data : []

  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })

  return (
    <main>
      <section className="border-line bg-surface border-b">
        <div className="mx-auto max-w-6xl px-4 pt-10 pb-8 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{farm.name}</h1>
            <LivePulse live={live} />
          </div>
          <p className="text-muted mt-1">
            {[farm.location, site ? `${site.lat.toFixed(2)}, ${site.lng.toFixed(2)}` : null, today]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <Link to="/dashboard?pick=1" className="btn mt-4">
            Choose another farm
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-8 px-4 pt-8 pb-12 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Fields" value={fields.length} />
          <Stat label="Hectares" value={summary.hectares.toLocaleString("en-US")} />
          <Stat label="Active seasons" value={active.length} hint={`${seasons.length} total`} />
          <Stat label="At thermal maturity" value={matured} hint="Thermal maturity or review" />
        </div>

        {summary.byStage.length > 0 && (
          <section aria-labelledby="mix">
            <h2 id="mix" className="mb-3 text-xl font-semibold tracking-tight">
              Farm summary
            </h2>
            <div className="card grid gap-6 p-5 sm:grid-cols-2 sm:p-6">
              <div>
                <p className="eyebrow">Seasons by crop</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {summary.byCrop.map((c) => (
                    <li key={c.crop} className="flex justify-between">
                      <span>{c.crop}</span>
                      <span className="tabular-nums">{c.seasons}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="eyebrow">Seasons by stage</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {summary.byStage.map((c) => (
                    <li key={c.stage} className="flex justify-between">
                      <span>{STAGE_LABEL[c.stage] ?? c.stage}</span>
                      <span className="tabular-nums">{c.seasons}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        <section aria-labelledby="alerts">
          <h2 id="alerts" className="mb-3 text-xl font-semibold tracking-tight">
            Needs attention
          </h2>
          {progressState.status === "ready" ? (
            <AlertsPanel alerts={alerts} />
          ) : progressState.status === "error" ? (
            <Failed what="alerts" error={progressState.error} />
          ) : (
            <Loading what="alerts" />
          )}
        </section>

        <section aria-labelledby="weather">
          <h2 id="weather" className="mb-3 text-xl font-semibold tracking-tight">
            Farm conditions
          </h2>
          {!site ? (
            <p className="card text-muted p-6">
              Set the farm coordinates to show weather, soil and pest data.
            </p>
          ) : conditions ? (
            <LiveConditions
              site={conditions.site}
              radiusKm={conditions.radiusKm}
              weather={conditions.weather}
              soil={conditions.soil}
              pests={conditions.pests}
            />
          ) : conditionsState.status === "error" ? (
            <Failed what="farm conditions" error={conditionsState.error} />
          ) : (
            <Loading what="farm conditions" />
          )}
        </section>

        <section aria-labelledby="progress">
          <h2 id="progress" className="mb-3 text-xl font-semibold tracking-tight">
            Season progress
          </h2>
          {progressState.status === "error" ? (
            <Failed what="season progress" error={progressState.error} />
          ) : active.length > 0 && !results ? (
            <Loading what="season progress" />
          ) : board.length === 0 ? (
            <p className="card text-muted p-6">No active seasons.</p>
          ) : (
            <SeasonBoard seasons={board} farm={farm.name} />
          )}
          <p className="text-muted mt-3 text-xs">
            GDD parameters are hand-authored and have no citations yet. Weather is cached for 30
            minutes.
          </p>
        </section>

        <section aria-labelledby="fields">
          <h2 id="fields" className="mb-3 text-xl font-semibold tracking-tight">
            Fields
          </h2>
          {fields.length === 0 ? (
            <p className="card text-muted p-6">No fields yet. Run the seed script to add them.</p>
          ) : (
            <FieldExplorer fields={fields} />
          )}
        </section>

        <CollapsibleSection
          title="Recommendations"
          hint={`${recommendations.filter((r) => r.status === "proposed").length} awaiting review`}
        >
          {recommendationState.status === "error" ? (
            <Failed what="recommendations" error={recommendationState.error} />
          ) : recommendationState.status === "loading" ? (
            <Loading what="recommendations" />
          ) : (
            <RecommendationQueue entries={recommendations} />
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Recent activity" hint={`${activity.length} stage changes`}>
          {activityState.status === "error" ? (
            <Failed what="activity" error={activityState.error} />
          ) : activityState.status === "loading" ? (
            <Loading what="activity" />
          ) : (
            <ActivityFeed entries={activity} />
          )}
        </CollapsibleSection>
      </div>
    </main>
  )
}
