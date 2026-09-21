import { Badge } from "@/components/ui"
import type { ReadinessCheck, ReadinessSummary } from "@/lib/readiness/types"

const TONE = { pass: "brand", warn: "warn", block: "heat" } as const
const LABEL = { pass: "Pass", warn: "Warning", block: "Blocked" } as const

export function ReadinessCard({
  checks,
  summary,
  nextStage,
}: {
  checks: ReadinessCheck[]
  summary: ReadinessSummary
  nextStage: string | null
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm">
        {summary.passed} of {summary.total} checks pass
        {nextStage ? ` for the move to ${nextStage}` : ""}. This is a checklist count, not a
        confidence score.
      </p>
      <ul className="divide-line divide-y">
        {checks.map((c) => (
          <li key={c.key} className="flex flex-wrap items-start justify-between gap-2 py-2 text-sm">
            <div>
              <p className="font-medium">{c.label}</p>
              <p className="text-muted">{c.detail}</p>
            </div>
            <Badge tone={TONE[c.status]}>{LABEL[c.status]}</Badge>
          </li>
        ))}
      </ul>
    </div>
  )
}
