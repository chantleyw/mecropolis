import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { ApiButton } from "@/components/ApiButton"
import { GddChart } from "@/components/GddChart"
import { StageStepper } from "@/components/StageStepper"
import { Badge, Section, STAGE_LABEL, STAGE_TONE, Stat } from "@/components/ui"
import { cropModelFor } from "@/lib/agronomy/cropModel"
import { accumulateGdd, type GddAccumulation } from "@/lib/agronomy/gdd"
import { loadSeason } from "@/lib/sanity/queries"
import { fetchArchive } from "@/lib/weather/openmeteo"
import { seasonWindow } from "@/lib/workflow/effects"

export const dynamic = "force-dynamic"

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

  const history = [...(season.stageHistory ?? [])].reverse()
  const pct =
    gdd && model ? Math.min(100, Math.round((gdd.total / model.gddToMaturity) * 100)) : null

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <header className="space-y-3">
        <Link href="/dashboard" className="text-muted hover:text-ink text-sm">
          ← Farm overview
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{season.fieldName ?? "Field"}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {season.cropName ?? "Unknown crop"} {season.year}
            </h1>
            {season.cultivar && <p className="text-muted mt-1">{season.cultivar}</p>}
          </div>
          <Badge tone={STAGE_TONE[stage]}>{STAGE_LABEL[stage] ?? stage}</Badge>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Planted" value={season.plantingDate ?? "Not set"} />
        <Stat label="Expected harvest" value={season.expectedHarvest ?? "Not set"} />
        <Stat
          label="GDD to maturity"
          value={pct !== null ? `${pct}%` : "n/a"}
          hint={gdd && model ? `${fmt(gdd.total)} of ${fmt(model.gddToMaturity)}` : undefined}
        />
        <Stat
          label="Field yield"
          value={season.yieldAmount != null ? `${fmt(season.yieldAmount)} kg/ha` : "Not recorded"}
        />
      </div>

      <Section
        title="Stage pipeline"
        aside={
          <ApiButton
            primary
            label="Reconcile now"
            url="/api/advance"
            body={{ seasonId: season._id }}
          />
        }
      >
        <StageStepper current={stage} />
        <p className="text-muted mt-5 text-sm">
          Stages advance from planting date and modelled growing degree days (GDD). Reaching thermal
          maturity does not mean a harvest was recorded.
        </p>
      </Section>

      <Section title="Why this stage: growing degree days">
        {!season.plantingDate && (
          <p className="text-muted">No planting date set; GDD is not accumulated.</p>
        )}
        {season.plantingDate && !model && <p className="text-muted">No GDD model for this crop.</p>}
        {gddError && (
          <p role="alert" className="bg-warn-soft text-warn rounded-lg p-3 text-sm">
            Weather archive unavailable: {gddError}
          </p>
        )}
        {gdd && model && (
          <div className="space-y-3">
            <GddChart
              points={gdd.running}
              emergence={model.gddToEmergence}
              maturity={model.gddToMaturity}
            />
            <p className="text-muted text-sm">
              {window?.start} to {window?.end}. Temperature data for {gdd.daysWithData} of{" "}
              {gdd.daysInWindow} days.{" "}
              {season.derivedMaturityDate
                ? `Thermal maturity reached on ${season.derivedMaturityDate}.`
                : ""}
            </p>
            <p className="text-muted text-xs">
              Model parameters: {model.source}. Not validated for this field.
            </p>
          </div>
        )}
        {history.length > 0 && (
          <ol className="border-line mt-6 space-y-4 border-l-2 pl-5">
            {history.map((h) => (
              <li key={h._key} className="relative text-sm">
                <span
                  aria-hidden
                  className="bg-brand absolute top-1.5 -left-[27px] h-2.5 w-2.5 rounded-full"
                />
                <p className="font-medium">
                  {STAGE_LABEL[h.previousStage ?? ""] ?? h.previousStage} →{" "}
                  {STAGE_LABEL[h.stage ?? ""] ?? h.stage}
                  {h.effectiveDate && (
                    <span className="text-muted font-normal"> · effective {h.effectiveDate}</span>
                  )}
                </p>
                <p className="text-muted">
                  {[
                    h.basis,
                    h.gddTotal != null ? `${fmt(h.gddTotal)} GDD` : null,
                    h.derivedFrom ? `source: ${h.derivedFrom}` : null,
                    h.triggeredBy ? `by ${h.triggeredBy}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="Regional benchmark" aside={<Badge tone="sky">Not this field</Badge>}>
        <p className="text-muted mb-4 text-sm">
          Published statistics for a region or country. They are not this field&apos;s yield and are
          not compared with it.
        </p>
        {season.benchmarks.length === 0 && (
          <p className="text-muted">
            {season.unavailableReason ?? "No regional benchmark published for this crop."}
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {season.benchmarks.map((b) => {
            const obs = [...(b.observations ?? [])].sort((a, c) => c.year - a.year).slice(0, 5)
            const max = Math.max(...obs.map((o) => o.value), 1)
            return (
              <div key={b._id} className="border-line bg-surface-2 rounded-xl border p-4">
                <p className="eyebrow">
                  {SOURCE_LABEL[b.source ?? ""] ?? b.source} · {b.scope}
                </p>
                <h3 className="mt-1 font-semibold">{b.region}</h3>
                <ul className="mt-3 space-y-1.5">
                  {obs.map((o) => (
                    <li
                      key={o.year}
                      className="grid grid-cols-[3rem_1fr_6rem] items-center gap-2 text-sm"
                    >
                      <span className="text-muted tabular-nums">{o.year}</span>
                      <span className="bg-line h-2 rounded-full">
                        <span
                          className="bg-sky block h-2 rounded-full"
                          style={{ width: `${(o.value / max) * 100}%` }}
                        />
                      </span>
                      <span className="text-right tabular-nums">
                        {o.value.toLocaleString("en-US")}{" "}
                        <span className="text-muted">{b.unit}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-muted mt-3 text-xs">
                  {b.licence}
                  {b.sourceUrl && (
                    <>
                      {" · "}
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
        </div>
      </Section>

      <Section
        title="Regional pest occurrences"
        aside={
          <ApiButton
            label="Load regional sightings"
            url="/api/pests"
            body={{ seasonId: season._id }}
          />
        }
      >
        <p className="text-muted mb-4 text-sm">
          GBIF records of watched species within 100 km of the farm. They are not observations on
          this field.
        </p>
        {season.pests.length === 0 ? (
          <p className="text-muted text-sm">No sightings stored.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="eyebrow">
                <tr>
                  <th className="pb-2 font-semibold">Species</th>
                  <th className="pb-2 font-semibold">Date</th>
                  <th className="pb-2 font-semibold">Distance</th>
                  <th className="pb-2 font-semibold">Record</th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {season.pests.map((p) => (
                  <tr key={p._id}>
                    <td className="py-2 font-medium">{p.pest}</td>
                    <td className="py-2 tabular-nums">{p.date}</td>
                    <td className="py-2 tabular-nums">{p.distanceKm} km</td>
                    <td className="py-2">
                      {p.sourceUrl && (
                        <a
                          className="text-sky underline"
                          href={p.sourceUrl}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          GBIF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </main>
  )
}
