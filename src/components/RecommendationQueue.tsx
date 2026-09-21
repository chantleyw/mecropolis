import Link from "next/link"
import { RecommendationActions } from "@/components/RecommendationActions"
import { Badge } from "@/components/ui"
import type { RecommendationEntry } from "@/lib/sanity/queries"

const TYPE_LABEL: Record<string, string> = {
  scout_pest: "Scout for pests",
  monitor: "Monitor",
  review_benchmark: "Review benchmark",
  review_data: "Review data",
  custom: "Custom",
}

const STATUS_TONE = {
  proposed: "heat",
  approved: "brand",
  completed: "sky",
  rejected: "neutral",
  expired: "neutral",
} as const

export function RecommendationQueue({ entries }: { entries: RecommendationEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-muted text-sm">No recommendations for this farm.</p>
  }
  return (
    <ul className="divide-line divide-y">
      {entries.map((r) => (
        <li key={r._id} className="py-4 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">
              {TYPE_LABEL[r.type] ?? r.type}
              <span className="text-muted font-normal">
                {" · "}
                <Link
                  href={`/seasons/${encodeURIComponent(r.seasonId)}`}
                  className="hover:underline"
                >
                  {r.seasonLabel}
                </Link>
                {r.fieldName && ` · ${r.fieldName}`}
              </span>
            </p>
            <Badge tone={STATUS_TONE[r.status as keyof typeof STATUS_TONE] ?? "neutral"}>
              {r.status}
            </Badge>
          </div>
          <p className="mt-2 text-sm">{r.rationale}</p>
          {r.evidence.length > 0 && (
            <details className="mt-2 text-sm">
              <summary className="text-muted cursor-pointer">
                Evidence ({r.evidence.length})
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
              r.createdBy ? `Proposed by ${r.createdBy}` : null,
              r.reviewedBy ? `${r.status} by ${r.reviewedBy}` : null,
              r.decisionNote,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <RecommendationActions id={r._id} status={r.status} />
        </li>
      ))}
    </ul>
  )
}
