export interface SummaryField {
  hectares: number | null
  seasons: { stage: string | null; cropName: string | null }[]
}

export interface Summary {
  hectares: number
  byCrop: { crop: string; seasons: number }[]
  byStage: { stage: string; seasons: number }[]
}

const count = (values: string[]) => {
  const map = new Map<string, number>()
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1)
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

export function summarise(fields: SummaryField[]): Summary {
  const seasons = fields.flatMap((f) => f.seasons)
  return {
    hectares: fields.reduce((sum, f) => sum + (f.hectares ?? 0), 0),
    byCrop: count(seasons.map((s) => s.cropName ?? "Unknown crop")).map(([crop, n]) => ({
      crop,
      seasons: n,
    })),
    byStage: count(seasons.map((s) => s.stage ?? "planning")).map(([stage, n]) => ({
      stage,
      seasons: n,
    })),
  }
}
