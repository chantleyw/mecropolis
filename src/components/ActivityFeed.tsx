import { Link } from "react-router"
import { Badge, stageLabel, StageBadge } from "@/components/ui"
import { t, useI18n } from "@/lib/i18n/store"
import type { ActivityEntry } from "@/lib/sanity/queries"

const label = (stage: string | null) => (stage ? stageLabel(stage) : t("common.unknown"))

export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  useI18n()
  if (entries.length === 0) {
    return <p className="text-muted text-sm">{t("dashboard.activity.empty")}</p>
  }
  return (
    <ol className="divide-line divide-y">
      {entries.map((e, i) => (
        <li key={`${e.seasonId}-${e.timestamp}-${i}`} className="py-3 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              to={`/seasons/${encodeURIComponent(e.seasonId)}`}
              className="font-medium hover:underline"
            >
              {e.seasonLabel}
              {e.fieldName && <span className="text-muted font-normal"> · {e.fieldName}</span>}
            </Link>
            <span className="text-muted text-xs tabular-nums">
              {e.effectiveDate ?? t("dashboard.noDate")}
            </span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            {e.previousStage && (
              <>
                <StageBadge stage={e.previousStage} />
                <span aria-hidden className="text-muted">
                  →
                </span>
              </>
            )}
            {e.stage ? <StageBadge stage={e.stage} /> : <Badge>{label(e.stage)}</Badge>}
          </p>
          {(e.basis || e.triggeredBy) && (
            <p className="text-muted mt-1 text-xs">
              {[e.basis, e.triggeredBy ? t("dashboard.activity.by", { name: e.triggeredBy }) : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </li>
      ))}
    </ol>
  )
}
