import { z } from "zod"

import type { EvidenceRef } from "../evidence/types"
import { RECOMMENDATION_TYPES } from "./types"

export const MAX_EVIDENCE = 30

const evidenceItem = z.object({
  kind: z.string().min(1).max(40),
  label: z.string().min(1).max(300),
  ref: z.string().max(500).optional(),
  detail: z.string().max(2000).optional(),
})
export type EvidenceItem = z.infer<typeof evidenceItem>

// POST /api/recommendations body, shared by the propose form and the Function.
export const proposalSchema = z.object({
  seasonId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/, "invalid document id"),
  type: z.enum(RECOMMENDATION_TYPES),
  rationale: z.string().trim().min(1, "Write a rationale").max(4000),
  evidence: z.array(evidenceItem).max(MAX_EVIDENCE).default([]),
  expiresAt: z.iso.datetime().optional(),
})
export type Proposal = z.input<typeof proposalSchema>

const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 3)}...` : s)

// The season's evidence (the same references the season page lists) in the stored shape.
export function toEvidenceItems(refs: EvidenceRef[]): EvidenceItem[] {
  return refs.slice(0, MAX_EVIDENCE).map((r) => {
    const label = clip(r.label, 300)
    switch (r.kind) {
      case "sanity-doc":
        return { kind: r.kind, label, ref: r.id, detail: r.docType }
      case "weather-snapshot":
        return { kind: r.kind, label, ref: r.id }
      case "calculation": {
        const inputs = Object.entries(r.inputs)
          .map(([k, v]) => `${k} ${v ?? "missing"}`)
          .join(", ")
        return { kind: r.kind, label, detail: clip(`${r.result} (${inputs})`, 2000) }
      }
      case "benchmark":
        return { kind: r.kind, label, detail: r.resolved ? "resolved" : "not resolved" }
      case "external":
        return { kind: r.kind, label, ...(r.url ? { ref: clip(r.url, 500) } : {}) }
    }
  })
}
