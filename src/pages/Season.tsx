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
import { Badge, Section, stageLabel, StageBadge, Stat } from "@/components/ui"
import { cropModelFor } from "@/lib/agronomy/cropModel"
import { accumulateGdd } from "@/lib/agronomy/gdd"
import { buildSeasonEvidence } from "@/lib/evidence/build"
import { readinessChecks } from "@/lib/readiness/checks"
import { summarizeReadiness } from "@/lib/readiness/explain"
import { dateLocale, t, useI18n } from "@/lib/i18n/store"
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

const fmt = (n: number) => Math.round(n).toLocaleString(dateLocale("en-US"))

interface GddRequest {
  lat: number
  lng: number
  modelName: string
  window: { start: string; end: string }
}

// Open-Meteo archive, called from the browser; the GDD sum runs against the crop model here.
async function fetchSeasonGdd({ lat, lng, modelName, window }: GddRequest) {
  const model = cropModelFor(modelName)
  if (!model) throw new Error(t("season.gdd.noModelFor", { name: modelName }))
  const series = await fetchArchive(lat, lng, window.start, window.end)
  return accumulateGdd(series.daily, window, model)
}

export function SeasonPage() {
  const { t } = useI18n()
  const id = useParams().id ?? ""
  const state = useLive(loadSeason, { id })
  const season = state.status === "ready" ? state.data : null
  useTitle(
    season
      ? `${season.cropName ?? t("season.title.fallback")} ${season.year}`
      : t("season.title.fallback"),
  )

  if (state.status === "loading") return <Loading what={t("season.loading.season")} />
  if (state.status === "error") {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Failed what={t("season.loading.season")} error={state.error} />
      </main>
    )
  }
  if (!state.data) return <NotFound what={t("season.notFound.what")} />
  return <Season season={state.data} live={state.live} />
}

function Season({ season, live }: { season: SeasonDetail; live: boolean }) {
  const { t } = useI18n()
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
              {season.cropName ?? t("season.unknownCrop")} {season.year}
            </h1>
            <p className="text-muted mt-1 flex flex-wrap items-center gap-x-3">
              {[season.fieldName ?? t("season.fieldFallback"), season.cultivar]
                .filter(Boolean)
                .join(" · ")}
              <LivePulse live={live} />
            </p>
          </div>
          <StageBadge stage={stage} />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("season.stat.planted")} value={season.plantingDate ?? t("season.notSet")} />
        <Stat
          label={t("season.stat.expectedHarvest")}
          value={season.expectedHarvest ?? t("season.notSet")}
        />
        <Stat
          label={t("season.stat.gddToMaturity")}
          value={pct !== null ? `${pct}%` : t("season.na")}
          hint={
            gdd && model
              ? t("season.stat.gddOf", { total: fmt(gdd.total), max: fmt(model.gddToMaturity) })
              : undefined
          }
        />
        <Stat
          label={t("season.stat.fieldYield")}
          value={
            season.yieldAmount != null
              ? `${fmt(season.yieldAmount)} kg/ha`
              : t("season.notRecorded")
          }
        />
      </div>

      <Section
        title={t("season.pipeline.title")}
        aside={
          <ApiButton
            primary
            label={t("season.pipeline.reconcile")}
            url="/api/advance"
            body={{ seasonId: season._id }}
          />
        }
      >
        <StageStepper current={stage} />
        <p className="text-muted mt-5 text-sm">{t("season.pipeline.note")}</p>
      </Section>

      <Section title={t("season.readiness.title")}>
        <ReadinessCard checks={checks} summary={readiness} nextStage={upcoming} />
      </Section>

      <CollapsibleSection
        title={t("season.evidence.title")}
        hint={t("season.evidence.hint", { count: evidence.length })}
      >
        <EvidenceList refs={evidence} />
      </CollapsibleSection>

      <CollapsibleSection title={t("season.propose.title")} hint={t("season.propose.hint")}>
        <ProposeRecommendation
          seasonId={season._id}
          farmSlug={season.farmSlug}
          evidence={evidence}
        />
      </CollapsibleSection>

      <Section title={t("season.gdd.title")}>
        {!season.plantingDate && <p className="text-muted">{t("season.gdd.noPlanting")}</p>}
        {season.plantingDate && !model && <p className="text-muted">{t("season.gdd.noModel")}</p>}
        {gddError && (
          <p role="alert" className="bg-warn-soft text-warn rounded-lg p-3 text-sm">
            {t("season.gdd.archiveUnavailable", { error: gddError })}
          </p>
        )}
        {gddState.status === "loading" && <Loading what={t("season.gdd.loading")} />}
        {gdd && model && (
          <div className="space-y-3">
            <GddChart
              points={gdd.running}
              emergence={model.gddToEmergence}
              maturity={model.gddToMaturity}
            />
            <p className="text-muted text-sm">
              {t("season.gdd.range", {
                start: window?.start ?? "",
                end: window?.end ?? "",
                days: gdd.daysWithData,
                total: gdd.daysInWindow,
              })}{" "}
              {season.derivedMaturityDate
                ? t("season.gdd.maturityReached", { date: season.derivedMaturityDate })
                : ""}
            </p>
            <p className="text-muted text-xs">
              {t("season.gdd.modelSource", { source: model.source })}
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
                  {stageLabel(h.previousStage ?? "")} → {stageLabel(h.stage ?? "")}
                  {h.effectiveDate && (
                    <span className="text-muted font-normal">
                      {" · "}
                      {t("season.stage.effective", { date: h.effectiveDate })}
                    </span>
                  )}
                </p>
                <p className="text-muted">
                  {[
                    h.basis,
                    h.gddTotal != null ? t("season.stage.gdd", { value: fmt(h.gddTotal) }) : null,
                    h.derivedFrom ? t("season.stage.source", { source: h.derivedFrom }) : null,
                    h.weatherSnapshotId
                      ? t("season.stage.snapshot", { id: h.weatherSnapshotId })
                      : null,
                    h.triggeredBy ? t("season.stage.by", { who: h.triggeredBy }) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <CollapsibleSection title={t("season.whatIf.title")} hint={t("season.whatIf.hint")}>
        <ScenarioSimulator seasonId={season._id} />
      </CollapsibleSection>

      <CollapsibleSection title={t("season.summary.title")} hint={t("season.summary.hint")}>
        <SeasonSummary seasonId={season._id} summary={season.aiSummary} />
      </CollapsibleSection>

      {/* Record-keeping panels sit side by side from 1024px and collapse independently; long
          content scrolls inside its panel so the page length stays fixed. */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <CollapsibleSection
          title={t("season.notes.title")}
          hint={
            season.notes?.length
              ? t("season.notes.hintCount", { count: season.notes.length })
              : t("season.notes.hintEmpty")
          }
          defaultOpen
        >
          <div className="max-h-96 overflow-y-auto pr-1">
            <SeasonNotes seasonId={season._id} rev={season._rev} notes={season.notes} />
          </div>
        </CollapsibleSection>

        {season.fieldId && (
          <CollapsibleSection
            title={t("season.photo.title")}
            hint={season.fieldPhoto?.asset ? undefined : t("season.photo.hintNone")}
            defaultOpen
          >
            <FieldPhoto
              fieldId={season.fieldId}
              fieldName={season.fieldName ?? t("season.fieldFallback")}
              photo={season.fieldPhoto}
            />
          </CollapsibleSection>
        )}

        {season.fieldId && (
          <CollapsibleSection
            title={t("season.soil.title")}
            hint={season.soilReport?.url ? t("season.soil.hintPdf") : t("season.soil.hintNone")}
          >
            <SoilReport fieldId={season.fieldId} report={season.soilReport} />
          </CollapsibleSection>
        )}

        <CollapsibleSection
          title={t("season.log.title")}
          hint={t("season.log.hint", {
            observations: season.observations.length,
            treatments: season.treatments.length,
          })}
        >
          <div className="max-h-[32rem] overflow-y-auto pr-1">
            <FieldLog season={season} />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title={t("season.history.title")} hint={t("season.history.hint")}>
          <div className="max-h-96 overflow-y-auto pr-1">
            <RevisionHistory id={season._id} rev={season._rev} />
          </div>
        </CollapsibleSection>
      </div>

      <Section
        title={t("season.benchmark.title")}
        aside={<Badge tone="sky">{t("season.benchmark.badge")}</Badge>}
      >
        <p className="text-muted mb-4 text-sm">{t("season.benchmark.note")}</p>
        {season.benchmarks.length === 0 && (
          <p className="text-muted">{season.unavailableReason ?? t("season.benchmark.none")}</p>
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
                        {o.value.toLocaleString(dateLocale("en-US"))}{" "}
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
                        {t("season.benchmark.source")}
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
        title={t("season.pests.title")}
        aside={
          <ApiButton
            label={t("season.pests.fetch")}
            url="/api/pests"
            body={{ seasonId: season._id }}
          />
        }
      >
        <p className="text-muted mb-4 text-sm">{t("season.pests.note")}</p>
        {season.pests.length === 0 ? (
          <p className="text-muted text-sm">{t("season.pests.none")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="eyebrow">
                <tr>
                  <th className="pb-2 font-semibold">{t("season.pests.species")}</th>
                  <th className="pb-2 font-semibold">{t("season.pests.date")}</th>
                  <th className="pb-2 font-semibold">{t("season.pests.distance")}</th>
                  <th className="pb-2 font-semibold">{t("season.pests.record")}</th>
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
