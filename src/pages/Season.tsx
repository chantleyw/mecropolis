import { useParams } from "react-router"

import { ApiButton } from "@/components/ApiButton"
import { CollapsibleSection } from "@/components/CollapsibleSection"
import { EvidenceList } from "@/components/EvidenceList"
import { FieldLog } from "@/components/FieldLog"
import { FieldPhoto } from "@/components/FieldPhoto"
import { GddChart } from "@/components/GddChart"
import { LivePulse } from "@/components/LivePulse"
import { ProposeRecommendation } from "@/components/ProposeRecommendation"
import { ReadinessCard } from "@/components/ReadinessCard"
import { RevisionHistory } from "@/components/RevisionHistory"
import { ScenarioSimulator } from "@/components/ScenarioSimulator"
import { SeasonNotes } from "@/components/SeasonNotes"
import { SeasonSummary } from "@/components/SeasonSummary"
import { SoilReport } from "@/components/SoilReport"
import { StageStepper } from "@/components/StageStepper"
import { Failed, Loading, NotFound } from "@/components/States"
import { Badge, Section, STAGE_LABEL, StageBadge, Stat } from "@/components/ui"
import { cropModelFor } from "@/lib/agronomy/cropModel"
import { accumulateGdd } from "@/lib/agronomy/gdd"
import { buildSeasonEvidence } from "@/lib/evidence/build"
import { readinessChecks } from "@/lib/readiness/checks"
import { summarizeReadiness } from "@/lib/readiness/explain"
import { safeHttpUrl } from "@/lib/safeUrl"
import { loadSeason, type SeasonDetail } from "@/lib/sanity/queries"
import { useLive } from "@/lib/sanity/useLive"
import { useAsync } from "@/lib/useAsync"
import { useTitle } from "@/lib/useTitle"
import { fetchArchive } from "@/lib/weather/openmeteo"
import { seasonWindow } from "@/lib/workflow/effects"
import { seasonInputs, transitionContext } from "@/lib/workflow/context"
import { evaluateAll } from "@/lib/workflow/guards"
import { nextStage } from "@/lib/workflow/reconcile"
import type { Stage } from "@/lib/workflow/types"

const SOURCE_LABEL: Record<string, string> = {
  psd: "USDA PSD",
  harveststat: "HarvestStat",
  worldbank: "World Bank",
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US")

interface GddRequest {
  lat: number
  lng: number
  modelName: string
  window: { start: string; end: string }
}

// Open-Meteo archive, called from the browser; the GDD sum runs against the crop model here.
async function fetchSeasonGdd({ lat, lng, modelName, window }: GddRequest) {
  const model = cropModelFor(modelName)
  if (!model) throw new Error(`No GDD model for ${modelName}`)
  const series = await fetchArchive(lat, lng, window.start, window.end)
  return accumulateGdd(series.daily, window, model)
}

export function SeasonPage() {
  const id = useParams().id ?? ""
  const state = useLive(loadSeason, { id })
  const season = state.status === "ready" ? state.data : null
  useTitle(season ? `${season.cropName ?? "Season"} ${season.year}` : "Season")

  if (state.status === "loading") return <Loading what="the season" />
  if (state.status === "error") {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Failed what="the season" error={state.error} />
      </main>
    )
  }
  if (!state.data) return <NotFound what="season" />
  return <Season season={state.data} live={state.live} />
}

function Season({ season, live }: { season: SeasonDetail; live: boolean }) {
  const stage = season.stage ?? "planning"
  const modelName = season.gddModelKey ?? season.cropName
  const model = modelName ? cropModelFor(modelName) : null
  const window =
    season.plantingDate && season.growthCycleDays
      ? seasonWindow(
          season.plantingDate,
          season.growthCycleDays,
          new Date().toISOString().slice(0, 10),
        )
      : null
  const { lat, lng } = season.coordinates ?? {}

  const gddState = useAsync(
    fetchSeasonGdd,
    model && modelName && window && lat != null && lng != null
      ? { lat, lng, modelName, window }
      : null,
  )
  const gdd = gddState.status === "ready" ? gddState.data : null
  const gddError = gddState.status === "error" ? gddState.error.message : null

  const now = new Date()
  const row = { ...season, stage: stage as Stage }
  const inputs = seasonInputs(row, now.toISOString().slice(0, 10))
  const ctx = transitionContext(row, inputs.model, gdd, now, season.derivedMaturityDate !== null)
  const checks = readinessChecks(inputs.season, ctx)
  const readiness = summarizeReadiness(checks)
  const upcoming = nextStage(inputs.season.stage)
  const evaluation = upcoming ? evaluateAll(inputs.season, upcoming, ctx) : null
  const evidence = buildSeasonEvidence({
    seasonId: season._id,
    cropId: season.cropId,
    fieldId: season.fieldId,
    model: inputs.model,
    gdd,
    benchmarkResolved: season.benchmarkResolved,
    guards: evaluation?.ok ? evaluation.guards : [],
    weatherSnapshotIds: [
      ...new Set((season.stageHistory ?? []).flatMap((h) => h.weatherSnapshotId ?? [])),
    ],
  })

  const history = [...(season.stageHistory ?? [])].reverse()
  const pct =
    gdd && model ? Math.min(100, Math.round((gdd.total / model.gddToMaturity) * 100)) : null

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {season.cropName ?? "Unknown crop"} {season.year}
            </h1>
            <p className="text-muted mt-1 flex flex-wrap items-center gap-x-3">
              {[season.fieldName ?? "Field", season.cultivar].filter(Boolean).join(" · ")}
              <LivePulse live={live} />
            </p>
          </div>
          <StageBadge stage={stage} />
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
          Stages advance from the planting date and modelled growing degree days (GDD). No harvest
          event is recorded.
        </p>
      </Section>

      <Section title="Decision readiness">
        <ReadinessCard checks={checks} summary={readiness} nextStage={upcoming} />
      </Section>

      <CollapsibleSection title="Evidence" hint={`${evidence.length} references`}>
        <EvidenceList refs={evidence} />
      </CollapsibleSection>

      <CollapsibleSection title="Propose a recommendation" hint="saved as a Sanity draft">
        <ProposeRecommendation
          seasonId={season._id}
          farmSlug={season.farmSlug}
          evidence={evidence}
        />
      </CollapsibleSection>

      <Section title="Growing degree days">
        {!season.plantingDate && (
          <p className="text-muted">No planting date set; GDD is not accumulated.</p>
        )}
        {season.plantingDate && !model && <p className="text-muted">No GDD model for this crop.</p>}
        {gddError && (
          <p role="alert" className="bg-warn-soft text-warn rounded-lg p-3 text-sm">
            Weather archive unavailable: {gddError}
          </p>
        )}
        {gddState.status === "loading" && <Loading what="the weather archive" />}
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
                    h.weatherSnapshotId ? `snapshot ${h.weatherSnapshotId}` : null,
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

      <CollapsibleSection title="What if?" hint="scenario calculation">
        <ScenarioSimulator seasonId={season._id} />
      </CollapsibleSection>

      <CollapsibleSection title="Season summary" hint="Sanity Agent Actions">
        <SeasonSummary seasonId={season._id} summary={season.aiSummary} />
      </CollapsibleSection>

      {/* Record-keeping panels sit side by side from 1024px and collapse independently; long
          content scrolls inside its panel so the page length stays fixed. */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <CollapsibleSection
          title="Season notes"
          hint={
            season.notes?.length
              ? `${season.notes.length} ${season.notes.length === 1 ? "note" : "notes"}`
              : "empty"
          }
          defaultOpen
        >
          <div className="max-h-96 overflow-y-auto pr-1">
            <SeasonNotes seasonId={season._id} rev={season._rev} notes={season.notes} />
          </div>
        </CollapsibleSection>

        {season.fieldId && (
          <CollapsibleSection
            title="Field photo"
            hint={season.fieldPhoto?.asset ? undefined : "none yet"}
            defaultOpen
          >
            <FieldPhoto
              fieldId={season.fieldId}
              fieldName={season.fieldName ?? "Field"}
              photo={season.fieldPhoto}
            />
          </CollapsibleSection>
        )}

        {season.fieldId && (
          <CollapsibleSection
            title="Soil test report"
            hint={season.soilReport?.url ? "PDF" : "none yet"}
          >
            <SoilReport fieldId={season.fieldId} report={season.soilReport} />
          </CollapsibleSection>
        )}

        <CollapsibleSection
          title="Field log"
          hint={`${season.observations.length} observations, ${season.treatments.length} treatments`}
        >
          <div className="max-h-[32rem] overflow-y-auto pr-1">
            <FieldLog season={season} />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Revision history" hint="Sanity History API">
          <div className="max-h-96 overflow-y-auto pr-1">
            <RevisionHistory id={season._id} rev={season._rev} />
          </div>
        </CollapsibleSection>
      </div>

      <Section title="Regional benchmark" aside={<Badge tone="sky">Not this field</Badge>}>
        <p className="text-muted mb-4 text-sm">
          Published statistics for a region or country. Contextual, not a field yield prediction.
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
              <div key={b._id} className="border-line border-t py-4">
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
                      <span className="bg-surface-2 h-2.5 rounded-[1px]">
                        <span
                          className="bg-sky block h-2.5 rounded-[1px]"
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
                  {safeHttpUrl(b.sourceUrl) && (
                    <>
                      {" · "}
                      <a
                        className="underline"
                        href={safeHttpUrl(b.sourceUrl) ?? undefined}
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
          <ApiButton label="Fetch sightings" url="/api/pests" body={{ seasonId: season._id }} />
        }
      >
        <p className="text-muted mb-4 text-sm">
          GBIF records of watched species within 100 km of the farm.
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
                      {safeHttpUrl(p.sourceUrl) && (
                        <a
                          className="text-sky underline"
                          href={safeHttpUrl(p.sourceUrl) ?? undefined}
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
