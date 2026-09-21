/** A pointer to where a decision input came from. Rendered in the UI and returned by the agent. */
export type EvidenceRef =
  | { kind: "sanity-doc"; docType: string; id: string; label: string }
  | { kind: "weather-snapshot"; id: string; label: string }
  | {
      kind: "calculation"
      name: string
      label: string
      /** Named inputs; null means the input was missing, which is not the same as zero. */
      inputs: Record<string, string | number | null>
      result: string
    }
  | { kind: "benchmark"; label: string; resolved: boolean }
  | { kind: "external"; source: string; label: string; url?: string }
