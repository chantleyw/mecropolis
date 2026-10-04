import { Link } from "react-router"
import { RecommendationActions } from "@/components/RecommendationActions"
import { Badge } from "@/components/ui"
import { useI18n } from "@/lib/i18n/store"
import { isStatus } from "@/lib/recommendations/machine"
import { RECOMMENDATION_TYPES } from "@/lib/recommendations/types"
import type { RecommendationEntry } from "@/lib/sanity/queries"

// Unknown values from the dataset are shown as stored.
const isType = (value: string): value is (typeof RECOMMENDATION_TYPES)[number] =>
  (RECOMMENDATION_TYPES as readonly string[]).includes(value)

const STATUS_TONE = {
  proposed: "heat",
  approved: "brand",
  completed: "sky",
  rejected: "neutral",
  expired: "neutral",
} as const

// Proposed entries are drafts read through /api/recommendations; the rest are published.
// `onChange` runs after a review so the caller can reread the drafts.
export function RecommendationQueue({
  entries,
  onChange,
}: {
  entries: RecommendationEntry[]
  onChange: () => void
}) {
  const { t } = useI18n()
  const typeLabel = (type: string) => (isType(type) ? t(`dashboard.rec.type.${type}`) : type)
  const statusLabel = (status: string) =>
    isStatus(status) ? t(`dashboard.rec.status.${status}`) : status
  if (entries.length === 0) {
    return <p className="text-muted text-sm">{t("dashboard.rec.empty")}</p>
  }
  return (
    <ul className="divide-line divide-y">
      {entries.map((r) => (
        <li key={r._id} className="py-4 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">
              {typeLabel(r.type)}
              <span className="text-muted font-normal">
                {" · "}
                <Link to={`/seasons/${encodeURIComponent(r.seasonId)}`} className="hover:underline">
                  {r.seasonLabel}
                </Link>
                {r.fieldName && ` · ${r.fieldName}`}
              </span>
            </p>
            <Badge tone={STATUS_TONE[r.status as keyof typeof STATUS_TONE] ?? "neutral"}>
              {statusLabel(r.status)}
            </Badge>
          </div>
          <p className="mt-2 text-sm">{r.rationale}</p>
          {r.evidence.length > 0 && (
            <details className="mt-2 text-sm">
              <summary className="text-muted cursor-pointer">
                {t("dashboard.rec.evidence", { count: r.evidence.length })}
              </summary>
              <ul className="mt-1 list-disc pl-5">
                {r.evidence.map((e, i) => (
                  <li key={i}>
                    {e.label}
                    {e.detail && <span className="text-muted"> ({e.detail})</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <p className="text-muted mt-2 text-xs">
            {[
              r.createdBy ? t("dashboard.rec.proposedBy", { name: r.createdBy }) : null,
              r.reviewedBy
                ? t("dashboard.rec.statusBy", { status: statusLabel(r.status), name: r.reviewedBy })
                : null,
              r.decisionNote,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <RecommendationActions id={r._id} status={r.status} onDone={onChange} />
        </li>
      ))}
    </ul>
  )
}
