import type { GddAccumulation } from "@/lib/agronomy/gdd"
import type { CropModel } from "@/lib/agronomy/cropModel"
import type { GuardReport } from "@/lib/workflow/guards"
import type { EvidenceRef } from "./types"

export interface SeasonEvidenceInput {
  seasonId: string
  cropId: string | null
  fieldId: string | null
  model: CropModel | null
  gdd: GddAccumulation | null
  benchmarkResolved: boolean
  guards: GuardReport[]
  weatherSnapshotIds: string[]
}

const round1 = (n: number) => Math.round(n * 10) / 10

/** Combines the inputs behind a season's stage decision into references, in a stable order. */
export function buildSeasonEvidence(input: SeasonEvidenceInput): EvidenceRef[] {
  const out: EvidenceRef[] = [
    { kind: "sanity-doc", docType: "season", id: input.seasonId, label: "Season" },
  ]
  if (input.cropId) {
    out.push({ kind: "sanity-doc", docType: "crop", id: input.cropId, label: "Crop" })
  }
  if (input.fieldId) {
    out.push({ kind: "sanity-doc", docType: "field", id: input.fieldId, label: "Field" })
  }
  if (input.model) {
    out.push({
      kind: "calculation",
      name: "cropModel",
      label: "Crop model (hand-authored, uncited)",
      inputs: {
        gddToEmergence: input.model.gddToEmergence,
        gddToMaturity: input.model.gddToMaturity,
        baseTempC: input.model.baseTempC,
        capTempC: input.model.capTempC,
      },
      result: input.model.source,
    })
  }
  if (input.gdd) {
    out.push({
      kind: "calculation",
      name: "gdd",
      label: "Accumulated growing degree days",
      inputs: {
        daysWithData: input.gdd.daysWithData,
        daysInWindow: input.gdd.daysInWindow,
        coverage: round1(input.gdd.coverage * 100),
      },
      result: `${round1(input.gdd.total)} GDD`,
    })
  }
  for (const g of input.guards) {
    out.push({
      kind: "calculation",
      name: `guard.${g.name}`,
      label: `Guard: ${g.name}`,
      inputs: {},
      result: g.result.valid ? "passed" : g.result.reason,
    })
  }
  for (const id of input.weatherSnapshotIds) {
    out.push({ kind: "weather-snapshot", id, label: "Weather snapshot" })
  }
  out.push({ kind: "benchmark", label: "Regional benchmark", resolved: input.benchmarkResolved })
  return out
}
