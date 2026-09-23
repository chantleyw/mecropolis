import { Link } from "react-router"
import { Badge, STAGE_LABEL, STAGE_TONE } from "@/components/ui"
import type { BoardSeason } from "@/lib/dashboard/board"

const fmt = (n: number) => Math.round(n).toLocaleString("en-US")

// An article with a stretched title link, so the card can hold buttons later.
export function SeasonProgressCard({
  season,
  compact,
}: {
  season: BoardSeason
  compact?: boolean
}) {
  const s = season.stage ?? "planning"
  const { result } = season
  return (
    <article className="card card-lift hover:border-brand relative p-5 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: season.colour ?? "var(--brand)" }}
            />
            <span className="truncate">{season.fieldName}</span>
          </p>
          <h3 className="mt-1 font-semibold">
            <Link
              to={`/seasons/${encodeURIComponent(season.id)}`}
              className="after:absolute after:inset-0 after:content-['']"
            >
              {season.cropName ?? "Unknown crop"}
            </Link>{" "}
            <span className="text-muted font-normal">{season.year}</span>
          </h3>
        </div>
        <Badge tone={STAGE_TONE[s]}>{STAGE_LABEL[s] ?? s}</Badge>
      </div>

      {result.status === "ok" && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-sm">
            <span className="tabular-nums">
              {fmt(result.total)} / {fmt(result.maturity)} GDD
            </span>
            <span className="text-muted tabular-nums">{result.pct}%</span>
          </div>
          <span
            className="bg-line mt-1.5 block h-2.5 rounded-full"
            role="progressbar"
            aria-valuenow={result.pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Growing degree days toward thermal maturity"
          >
            <span
              className="bar-fill shine from-brand-2 to-brand block h-2.5 rounded-full bg-gradient-to-r shadow-[0_0_10px_var(--brand)]"
              style={{ width: `${result.pct}%` }}
            />
          </span>
          {!compact && (
            <p className="text-muted mt-1.5 text-xs">
              Temperature data for {result.daysWithData} of {result.daysInWindow} days.
            </p>
          )}
        </div>
      )}
      {result.status === "missing" && (
        <p className="text-muted mt-4 text-sm">GDD progress unavailable: {result.reason}.</p>
      )}
      {result.status === "error" && (
        <p className="text-muted mt-4 text-sm">GDD progress unavailable: weather fetch failed.</p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted text-xs">Planted</dt>
          <dd className="tabular-nums">{season.plantingDate ?? "Not set"}</dd>
        </div>
        <div>
          <dt className="text-muted text-xs">Expected harvest</dt>
          <dd className="tabular-nums">{season.expectedHarvest ?? "Not set"}</dd>
        </div>
      </dl>
    </article>
  )
}
