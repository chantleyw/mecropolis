import type { BenchmarkSource, Resolution } from "./resolve"

export interface BenchmarkWriter {
  createOrReplace: (doc: Record<string, unknown>) => Promise<unknown>
}

// One `benchmark` document per crop and source, with a deterministic _id so reruns replace.
export function benchmarkDoc(cropId: string, s: BenchmarkSource) {
  return {
    _id: `benchmark.${cropId}.${s.source}`,
    _type: "benchmark",
    source: s.source,
    scope: s.scope,
    region: s.region,
    commodity: s.commodity,
    crop: { _type: "reference", _ref: cropId },
    unit: "kg/ha",
    observations: s.observations.map((o) => ({
      _key: String(o.year),
      _type: "observation",
      year: o.year,
      value: o.kgPerHa,
    })),
    sourceUrl: s.sourceUrl,
    licence: s.licence,
    retrievedAt: `${s.retrievedAt}T00:00:00Z`,
  }
}

// Writes benchmark documents for an available resolution; returns how many were written.
export async function syncBenchmarks(
  writer: BenchmarkWriter,
  cropId: string,
  resolution: Resolution,
): Promise<number> {
  if (resolution.status === "unavailable") return 0
  for (const s of resolution.sources) await writer.createOrReplace(benchmarkDoc(cropId, s))
  return resolution.sources.length
}
