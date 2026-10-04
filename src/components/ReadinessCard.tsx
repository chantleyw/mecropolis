import { Badge, stageLabel } from "@/components/ui"
import { useI18n } from "@/lib/i18n/store"
import type { ReadinessCheck, ReadinessSummary } from "@/lib/readiness/types"

const TONE = { pass: "brand", warn: "warn", block: "heat" } as const

export function ReadinessCard({
  checks,
  summary,
  nextStage,
}: {
  checks: ReadinessCheck[]
  summary: ReadinessSummary
  nextStage: string | null
}) {
  const { t } = useI18n()
  const counts = { passed: summary.passed, total: summary.total }
  return (
    <div className="space-y-3">
      <p className="text-sm">
        {nextStage
          ? t("season.readiness.countNext", { ...counts, next: stageLabel(nextStage) })
          : t("season.readiness.count", counts)}
      </p>
      <ul className="divide-line divide-y">
        {checks.map((c) => (
          <li key={c.key} className="flex flex-wrap items-start justify-between gap-2 py-2 text-sm">
            <div>
              <p className="font-medium">{c.label}</p>
              <p className="text-muted">{c.detail}</p>
            </div>
            <Badge tone={TONE[c.status]}>{t(`season.readiness.status.${c.status}` as const)}</Badge>
          </li>
        ))}
      </ul>
    </div>
  )
}
