import type { DocumentBadgeComponent, DocumentBadgeDescription } from "sanity"

import { isStatus } from "@/lib/recommendations/machine"
import type { Stage } from "@/lib/workflow/types"

const RECOMMENDATION_TONE: Record<string, DocumentBadgeDescription["color"]> = {
  proposed: "warning",
  approved: "primary",
  rejected: "danger",
  completed: "success",
  expired: undefined,
}

export const recommendationStatusBadge: DocumentBadgeComponent = (props) => {
  if (props.type !== "agronomyRecommendation") return null
  const doc = (props.draft ?? props.published) as { status?: string } | null
  const status = doc?.status
  if (!status || !isStatus(status)) return null
  return { label: status, color: RECOMMENDATION_TONE[status] }
}

export const seasonStageBadge: DocumentBadgeComponent = (props) => {
  if (props.type !== "season") return null
  const doc = (props.draft ?? props.published) as { stage?: Stage } | null
  if (!doc?.stage) return null
  return { label: doc.stage }
}

const PEST_SEVERITY_TONE: Record<string, DocumentBadgeDescription["color"]> = {
  critical: "danger",
  high: "danger",
  medium: "warning",
  low: undefined,
}

export const pestSeverityBadge: DocumentBadgeComponent = (props) => {
  if (props.type !== "pestReport") return null
  const doc = (props.draft ?? props.published) as { severity?: string } | null
  const severity = doc?.severity
  if (!severity) return null
  return { label: severity, color: PEST_SEVERITY_TONE[severity] }
}
