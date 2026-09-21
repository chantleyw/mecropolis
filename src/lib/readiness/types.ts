import type { EvidenceRef } from "@/lib/evidence/types"

export interface ReadinessCheck {
  key: string
  label: string
  /** block: the decision cannot be made; warn: it can, but something is incomplete. */
  status: "pass" | "warn" | "block"
  detail: string
  evidence?: EvidenceRef[]
}

export interface ReadinessSummary {
  passed: number
  total: number
  /** passed / total, rounded. A checklist share, not a statistical confidence. */
  percent: number
  blockers: ReadinessCheck[]
  warnings: ReadinessCheck[]
}
