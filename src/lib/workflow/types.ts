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
}

export interface TransitionContext {
  /** Current time, injected so guards stay pure. */
  now: Date
  treatmentCount: number
  notes: string
  /** Minimum days between planting and "growing". */
  minDaysToGrowing: number
}

export type GuardResult = { valid: true } | { valid: false; reason: string }

export type Guard = (season: SeasonState, context: TransitionContext) => GuardResult
