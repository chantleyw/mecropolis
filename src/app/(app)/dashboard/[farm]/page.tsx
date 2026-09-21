import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { ActivityFeed } from "@/components/ActivityFeed"
import { AlertsPanel } from "@/components/AlertsPanel"
import { Aurora } from "@/components/Aurora"
import { CollapsibleSection } from "@/components/CollapsibleSection"
import { FieldExplorer } from "@/components/FieldExplorer"
import { LiveConditions } from "@/components/LiveConditions"
import { SeasonBoard } from "@/components/SeasonBoard"
import { STAGE_LABEL, Stat } from "@/components/ui"
import { buildAlerts } from "@/lib/dashboard/alerts"
import { curveOf, toBoardResult, type BoardSeason } from "@/lib/dashboard/board"
import { loadSeasonProgress } from "@/lib/dashboard/progress"
import { summarise } from "@/lib/dashboard/summary"
import { loadSiteConditions } from "@/lib/public/landingData"
import { loadFarmOverview, loadRecentActivity } from "@/lib/sanity/queries"

export const dynamic = "force-dynamic"

const MATURE_STAGES = ["harvested", "review"]

export default async function FarmDashboard({ params }: { params: Promise<{ farm: string }> }) {
  if (!(await auth())) redirect("/signin")
  const slug = decodeURIComponent((await params).farm)
  const [{ farm, fields }, activity] = await Promise.all([
    loadFarmOverview(slug),
    loadRecentActivity(slug),
  ])
  if (!farm) notFound()

  const summary = summarise(fields)
  const seasons = fields.flatMap((f) => f.seasons.map((s) => ({ ...s, field: f })))
  const active = seasons.filter((s) => s.stage !== "review")
  const matured = seasons.filter((s) => MATURE_STAGES.includes(s.stage ?? "")).length

  const { lat, lng } = farm.coordinates ?? {}
  const site =
    lat != null && lng != null ? { lat, lng, label: farm.location ?? "Farm location" } : null

  const [conditions, results] = await Promise.all([
    site ? loadSiteConditions(site) : null,
    Promise.all(
      active.map((s) =>
        loadSeasonProgress({
          lat: s.field.coordinates?.lat,
          lng: s.field.coordinates?.lng,
          cropName: s.gddModelKey ?? s.cropName,
          plantingDate: s.plantingDate,
          growthCycleDays: s.growthCycleDays,
        }),
      ),
    ),
  ])

  // Zipped into one object per season so sorting and filtering cannot misalign results.
  const board: BoardSeason[] = active.map((s, i) => {
    const result = results[i] ?? ({ status: "error" } as const)
    return {
      id: s._id,
      cropName: s.cropName,
      year: s.year,
      fieldId: s.field._id,
      fieldName: s.field.name,
      colour: s.field.colour,
      stage: s.stage,
      plantingDate: s.plantingDate,
      expectedHarvest: s.expectedHarvest,
      pestCount: s.pestCount,
      result: toBoardResult(result),
      curve: curveOf(result),
    }
  })

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
          : b.result,
    })),
    conditions?.weather.ok ? conditions.weather.data.days : null,
    todayIso,
  )

  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })

  return (
    <main>
      <section className="relative overflow-hidden">
        <Aurora />
        <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-8 sm:px-6">
          <p className="eyebrow">Farm dashboard</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{farm.name}</h1>
          <p className="text-muted mt-1">
            {[farm.location, site ? `${site.lat.toFixed(2)}, ${site.lng.toFixed(2)}` : null, today]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <Link href="/dashboard?pick=1" className="btn mt-4">
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
          <AlertsPanel alerts={alerts} />
        </section>

        <section aria-labelledby="weather">
          <h2 id="weather" className="mb-3 text-xl font-semibold tracking-tight">
            Farm conditions
          </h2>
          {conditions ? (
            <LiveConditions
              site={conditions.site}
              radiusKm={conditions.radiusKm}
              weather={conditions.weather}
              soil={conditions.soil}
              pests={conditions.pests}
            />
          ) : (
            <p className="card text-muted p-6">
              Set the farm coordinates in the Studio to show weather, soil and pest data.
            </p>
          )}
        </section>

        <section aria-labelledby="progress">
          <h2 id="progress" className="mb-3 text-xl font-semibold tracking-tight">
            Season progress
          </h2>
          {board.length === 0 ? (
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
            <p className="card text-muted p-6">
              No fields yet. Run the seed script or add one in the Studio.
            </p>
          ) : (
            <FieldExplorer fields={fields} />
          )}
        </section>

        <CollapsibleSection title="Recent activity" hint={`${activity.length} stage changes`}>
          <ActivityFeed entries={activity} />
        </CollapsibleSection>
      </div>
    </main>
  )
}
