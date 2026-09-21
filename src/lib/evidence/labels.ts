import type { EvidenceRef } from "./types"

/** One-line description of a reference for lists and the agent. */
export function evidenceLabel(ref: EvidenceRef): string {
  switch (ref.kind) {
    case "sanity-doc":
      return `${ref.label} (${ref.docType} ${ref.id})`
    case "weather-snapshot":
      return `${ref.label} ${ref.id}`
    case "calculation":
      return `${ref.label}: ${ref.result}`
    case "benchmark":
      return `${ref.label}: ${ref.resolved ? "resolved" : "not resolved"}`
    case "external":
      return `${ref.label} (${ref.source})`
  }
}
