import { Link } from "react-router"
import { Badge, STAGE_LABEL, STAGE_TONE } from "@/components/ui"
import type { ActivityEntry } from "@/lib/sanity/queries"

const label = (stage: string | null) => (stage ? (STAGE_LABEL[stage] ?? stage) : "Unknown")

export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) return <p className="text-muted text-sm">No stage changes recorded.</p>
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
            <span className="text-muted text-xs tabular-nums">{e.effectiveDate ?? "No date"}</span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            {e.previousStage && (
              <>
                <Badge tone={STAGE_TONE[e.previousStage] ?? "neutral"}>
                  {label(e.previousStage)}
                </Badge>
                <span aria-hidden className="text-muted">
                  →
                </span>
              </>
            )}
            <Badge tone={STAGE_TONE[e.stage ?? ""] ?? "neutral"}>{label(e.stage)}</Badge>
          </p>
          {(e.basis || e.triggeredBy) && (
            <p className="text-muted mt-1 text-xs">
              {[e.basis, e.triggeredBy ? `by ${e.triggeredBy}` : null].filter(Boolean).join(" · ")}
            </p>
          )}
        </li>
      ))}
    </ol>
  )
}
