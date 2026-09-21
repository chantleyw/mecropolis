import type { CropModel } from "@/lib/agronomy/cropModel"
import type { GddAccumulation } from "@/lib/agronomy/gdd"

export const STAGES = [
  "planning",
  "planted",
  "growing",
  "pre-harvest",
  "harvested",
  "review",
] as const

export type Stage = (typeof STAGES)[number]

export interface SeasonState {
  stage: Stage
  cropId: string | null
  plantingDate: string | null
  actualHarvest: string | null
  yieldAmount: number | null
  /** First date accumulated GDD reached the crop's maturity threshold; derived, never typed. */
  derivedMaturityDate: string | null
}

export interface TransitionContext {
  /** Current time, injected so guards stay pure. */
  now: Date
  notes: string
  /** Null when the crop has no model; GDD guards then fail with a distinct reason. */
  cropModel: CropModel | null
  /** Null when no weather archive could be fetched. */
  gdd: GddAccumulation | null
  /** Minimum share (0 to 1) of window days that must have temperature data. */
  minCoverage: number
  /** Share (0 to 1) of gddToMaturity at which a crop counts as pre-harvest. */
  preHarvestFraction: number
  /** A weather snapshot covering planting to maturity exists. */
  seasonArchiveComplete: boolean
  /** A regional benchmark has been resolved for the crop (or is recorded as unavailable). */
  benchmarkResolved: boolean
}

export type GuardResult = { valid: true } | { valid: false; reason: string }

export type Guard = (season: SeasonState, context: TransitionContext) => GuardResult
