import { cropModelFor, type CropModel } from "@/lib/agronomy/cropModel"
import type { GddAccumulation, GddWindow } from "@/lib/agronomy/gdd"
import { seasonWindow } from "./effects"
import type { SeasonState, TransitionContext } from "./types"

export const MIN_COVERAGE = 0.9
export const PRE_HARVEST_FRACTION = 0.9

/** GROQ projection of everything the reconciler, readiness and evidence need for one season. */
export const SEASON_FIELDS = `_id, _rev, stage, plantingDate, expectedHarvest, actualHarvest, yieldAmount,
  derivedMaturityDate,
  "cropId": crop._ref,
  "cropName": crop->name,
  "gddModelKey": crop->gddModelKey,
  "fieldId": field._ref,
  "growthCycleDays": crop->growthCycleDays,
  "coordinates": select(defined(field->coordinates) => field->coordinates{lat, lng}, field->farm->coordinates{lat, lng}),
  "benchmarkResolved": defined(crop->benchmarks.unavailableReason)
    || count(*[_type == "benchmark" && crop._ref == ^.crop._ref]) > 0`

export interface SeasonRow {
  _id: string
  _rev: string
  stage: SeasonState["stage"] | null
  plantingDate: string | null
  expectedHarvest: string | null
  actualHarvest: string | null
  yieldAmount: number | null
  derivedMaturityDate: string | null
  cropId: string | null
  cropName: string | null
  gddModelKey: string | null
  fieldId: string | null
  growthCycleDays: number | null
  coordinates: { lat: number | null; lng: number | null } | null
  benchmarkResolved: boolean
}

export interface SeasonInputs {
  season: SeasonState
  model: CropModel | null
  window: GddWindow | null
  at: { lat: number; lng: number } | null
}

/** Everything derivable from a season row without fetching weather. */
export function seasonInputs(row: SeasonRow, today: string): SeasonInputs {
  const season: SeasonState = {
    stage: row.stage ?? "planning",
    cropId: row.cropId,
    plantingDate: row.plantingDate,
    actualHarvest: row.actualHarvest,
    yieldAmount: row.yieldAmount,
    derivedMaturityDate: row.derivedMaturityDate,
  }
  const modelName = row.gddModelKey ?? row.cropName
  const model = modelName ? cropModelFor(modelName) : null
  const window =
    season.plantingDate && row.growthCycleDays
      ? seasonWindow(season.plantingDate, row.growthCycleDays, today)
      : null
  const at =
    row.coordinates && row.coordinates.lat !== null && row.coordinates.lng !== null
      ? { lat: row.coordinates.lat, lng: row.coordinates.lng }
      : null
  return { season, model, window, at }
}

export function transitionContext(
  row: SeasonRow,
  model: CropModel | null,
  gdd: GddAccumulation | null,
  now: Date,
  seasonArchiveComplete: boolean,
): TransitionContext {
  return {
    now,
    notes: "",
    cropModel: model,
    gdd,
    minCoverage: MIN_COVERAGE,
    preHarvestFraction: PRE_HARVEST_FRACTION,
    seasonArchiveComplete,
    benchmarkResolved: row.benchmarkResolved,
  }
}
