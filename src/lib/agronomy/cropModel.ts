export interface CropModel {
  baseTempC: number
  capTempC: number
  gddToEmergence: number
  gddToMaturity: number
  /** Where the numbers come from. */
  source: string
}

// Hand-authored model parameters, not measured values for this field. Each `source` says so and
// must be replaced with a citation before the parameters are presented as validated.
export const CROP_MODELS: Record<string, CropModel> = {
  wheat: {
    baseTempC: 0,
    capTempC: 25,
    gddToEmergence: 120,
    gddToMaturity: 2200,
    source: "Model parameter (hand-authored, citation pending): winter wheat, base 0 C",
  },
  canola: {
    baseTempC: 5,
    capTempC: 30,
    gddToEmergence: 90,
    gddToMaturity: 1500,
    source: "Model parameter (hand-authored, citation pending): canola, base 5 C",
  },
  "narrow-leafed lupin": {
    baseTempC: 4,
    capTempC: 30,
    gddToEmergence: 110,
    gddToMaturity: 1800,
    source: "Model parameter (hand-authored, citation pending): narrow-leafed lupin, base 4 C",
  },
}

const ALIASES: Record<string, string> = {
  "winter wheat": "wheat",
  rapeseed: "canola",
  lupin: "narrow-leafed lupin",
  lupins: "narrow-leafed lupin",
}

/** Looked up by crop name only. There is deliberately no category fallback: base temperatures differ per crop. */
export function cropModelFor(name: string): CropModel | null {
  const key = name.trim().toLowerCase()
  return CROP_MODELS[ALIASES[key] ?? key] ?? null
}
