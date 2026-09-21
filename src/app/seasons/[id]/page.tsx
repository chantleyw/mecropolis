import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { ApiButton } from "@/components/ApiButton"
import { cropModelFor } from "@/lib/agronomy/cropModel"
import { accumulateGdd, type GddAccumulation } from "@/lib/agronomy/gdd"
import { loadSeason } from "@/lib/sanity/queries"
import { fetchArchive } from "@/lib/weather/openmeteo"
import { seasonWindow } from "@/lib/workflow/effects"
import { STAGES } from "@/lib/workflow/types"

export const dynamic = "force-dynamic"

const STAGE_LABEL: Record<string, string> = {
  planning: "Planning",
  planted: "Planted",
  growing: "Growing",
  "pre-harvest": "Pre-harvest",
  harvested: "Thermal maturity (derived)",
  review: "Review",
}

const SOURCE_LABEL: Record<string, string> = {
  psd: "USDA PSD",
  harveststat: "HarvestStat",
  worldbank: "World Bank",
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US")

export default async function SeasonPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await auth())) redirect("/signin")
  const { id } = await params
  const season = await loadSeason(decodeURIComponent(id))
  if (!season) notFound()

  const stage = season.stage ?? "planning"
  const model = season.cropName ? cropModelFor(season.cropName) : null
  const window =
    season.plantingDate && season.growthCycleDays
      ? seasonWindow(
          season.plantingDate,
          season.growthCycleDays,
          new Date().toISOString().slice(0, 10),
        )
      : null
  const { lat, lng } = season.coordinates ?? {}

  let gdd: GddAccumulation | null = null
  let gddError: string | null = null
  if (model && window && lat != null && lng != null) {
    try {
      const series = await fetchArchive(lat, lng, window.start, window.end)
      gdd = accumulateGdd(series.daily, window, model)
    } catch (e) {
      gddError = e instanceof Error ? e.message : "Weather archive fetch failed"
    }
  }

  const history = season.stageHistory ?? []
  const reached = new Set([stage, ...history.map((h) => h.stage)])

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6">
      <header>
        <Link href="/" className="text-sm underline">
          Farm overview
        </Link>
        <h1 className="text-2xl font-semibold">
          {season.fieldName ?? "Field"}: {season.cropName ?? "Unknown crop"} {season.year}
        </h1>
        {season.cultivar && <p className="text-sm opacity-70">{season.cultivar}</p>}
      </header>

      <section aria-labelledby="pipeline" className="space-y-3">
        <h2 id="pipeline" className="text-lg font-medium">
          Stage pipeline
        </h2>
        <ol className="flex flex-wrap gap-2 text-sm">
          {STAGES.map((s) => (
            <li
              key={s}
              aria-current={s === stage ? "step" : undefined}
              className={`rounded border px-2 py-1 ${s === stage ? "font-semibold" : reached.has(s) ? "" : "opacity-50"}`}
            >
              {STAGE_LABEL[s]}
            </li>
          ))}
        </ol>
        <p className="text-sm">
          Stages advance from planting date and modelled growing degree days (GDD), not from a
          recorded harvest.
        </p>
        <ApiButton label="Reconcile now" url="/api/advance" body={{ seasonId: season._id }} />
      </section>

      <section aria-labelledby="gdd" className="space-y-2">
        <h2 id="gdd" className="text-lg font-medium">
          Why this stage: GDD progress
        </h2>
        {!season.plantingDate && <p>No planting date set; GDD is not accumulated.</p>}
        {season.plantingDate && !model && <p>No GDD model for this crop.</p>}
        {gddError && <p role="alert">Weather archive unavailable: {gddError}</p>}
        {gdd && model && (
          <>
            <p className="text-sm">
              {fmt(gdd.total)} of {fmt(model.gddToMaturity)} GDD to maturity (emergence at{" "}
              {fmt(model.gddToEmergence)}), from {window?.start} to {window?.end}. Temperature data
              for {gdd.daysWithData} of {gdd.daysInWindow} days.
            </p>
            <progress
              className="w-full"
              value={Math.min(gdd.total, model.gddToMaturity)}
              max={model.gddToMaturity}
              aria-label="GDD progress to maturity"
            />
            <p className="text-sm opacity-70">
              Model parameters: {model.source}. Not validated for this field.
            </p>
          </>
        )}
        {season.derivedMaturityDate && (
          <p className="text-sm">Thermal maturity reached on {season.derivedMaturityDate}.</p>
        )}
        {history.length > 0 && (
          <ul className="space-y-1 text-sm">
            {history.map((h) => (
              <li key={h._key}>
                {h.previousStage} to {h.stage}
                {h.effectiveDate ? ` (effective ${h.effectiveDate})` : ""}
                {h.basis ? `: ${h.basis}` : ""}
                {h.derivedFrom ? ` [${h.derivedFrom}]` : ""}
                {h.gddTotal != null ? `, ${fmt(h.gddTotal)} GDD` : ""}
                {h.triggeredBy ? `, by ${h.triggeredBy}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="yield" className="space-y-1">
        <h2 id="yield" className="text-lg font-medium">
          Field yield
        </h2>
        <p>{season.yieldAmount != null ? `${fmt(season.yieldAmount)} kg/ha` : "Not recorded"}</p>
      </section>

      <section aria-labelledby="bench" className="space-y-3 rounded border p-4">
        <h2 id="bench" className="text-lg font-medium">
          Regional benchmark, not this field
        </h2>
        <p className="text-sm">
          Published statistics for a region or country. They are not this field&apos;s yield and are
          not compared with it.
        </p>
        {season.benchmarks.length === 0 && (
          <p>{season.unavailableReason ?? "No regional benchmark published for this crop."}</p>
        )}
        {season.benchmarks.map((b) => {
          const obs = [...(b.observations ?? [])].sort((a, c) => c.year - a.year).slice(0, 5)
          return (
            <div key={b._id} className="text-sm">
              <h3 className="font-medium">
                {SOURCE_LABEL[b.source ?? ""] ?? b.source}: {b.region} ({b.scope})
              </h3>
              <ul>
                {obs.map((o) => (
                  <li key={o.year}>
                    {o.year}: {o.value.toLocaleString("en-US")} {b.unit}
                  </li>
                ))}
              </ul>
              <p className="opacity-70">
                {b.licence}
                {b.sourceUrl && (
                  <>
                    {" "}
                    <a
                      className="underline"
                      href={b.sourceUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Source
                    </a>
                  </>
                )}
              </p>
            </div>
          )
        })}
      </section>

      <section aria-labelledby="pests" className="space-y-3">
        <h2 id="pests" className="text-lg font-medium">
          Regional pest occurrences
        </h2>
        <p className="text-sm">
          GBIF records of watched species within 100 km of the farm. They are not observations on
          this field.
        </p>
        <ApiButton
          label="Load regional sightings"
          url="/api/pests"
          body={{ seasonId: season._id }}
        />
        {season.pests.length === 0 && <p className="text-sm">No sightings stored.</p>}
        <ul className="space-y-1 text-sm">
          {season.pests.map((p) => (
            <li key={p._id}>
              {p.pest}: regional occurrence, {p.distanceKm} km from the farm, {p.date}
              {p.sourceUrl && (
                <>
                  {" "}
                  <a
                    className="underline"
                    href={p.sourceUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    GBIF record
                  </a>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
