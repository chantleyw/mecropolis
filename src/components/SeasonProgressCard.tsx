import { Link } from "react-router"
import { StageBadge, STAGE_SWATCH } from "@/components/ui"
import type { BoardSeason } from "@/lib/dashboard/board"
import { reasonText } from "@/lib/dashboard/progress"
import { dateLocale, useI18n } from "@/lib/i18n/store"
import { photoUrl } from "@/lib/sanity/image"

const fmt = (n: number) => Math.round(n).toLocaleString(dateLocale("en-US"))

// An article with a stretched title link, so the card can hold buttons later.
export function SeasonProgressCard({
  season,
  compact,
}: {
  season: BoardSeason
  compact?: boolean
}) {
  const { t } = useI18n()
  const s = season.stage ?? "planning"
  const { result, photo } = season
  const thumb = photo && !compact ? photoUrl(photo, 640, 256) : null
  return (
    <article className="card hover:border-ink relative p-5 transition-colors">
      {photo && thumb && (
        <div
          aria-hidden
          className="border-line -mx-5 -mt-5 mb-4 aspect-[5/2] overflow-hidden rounded-t-[inherit] border-b bg-cover bg-center"
          style={{
            backgroundColor: photo.asset?.dominant ?? undefined,
            backgroundImage: photo.asset?.lqip ? `url(${photo.asset.lqip})` : undefined,
          }}
        >
          <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ background: season.colour ?? "var(--brand)" }}
            />
            <span className="truncate">{season.fieldName}</span>
          </p>
          <h3 className="mt-1 font-semibold">
            <Link
              to={`/seasons/${encodeURIComponent(season.id)}`}
              className="after:absolute after:inset-0 after:content-['']"
            >
              {season.cropName ?? t("dashboard.unknownCrop")}
            </Link>{" "}
            <span className="text-muted font-normal">{season.year}</span>
          </h3>
        </div>
        <StageBadge stage={s} />
      </div>

      {result.status === "ok" && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-sm">
            <span className="tabular-nums">
              {t("dashboard.card.gddOf", {
                total: fmt(result.total),
                maturity: fmt(result.maturity),
              })}
            </span>
            <span className="text-muted tabular-nums">{result.pct}%</span>
          </div>
          <span
            className="bg-surface-2 mt-1.5 block h-2.5 overflow-hidden rounded-[2px]"
            role="progressbar"
            aria-valuenow={result.pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("dashboard.card.barLabel")}
          >
            <span
              className="bar-fill block h-2.5"
              style={{ width: `${result.pct}%`, background: STAGE_SWATCH[s] ?? "var(--r3)" }}
            />
          </span>
          {!compact && (
            <p className="text-muted mt-1.5 text-xs">
              {t("dashboard.card.tempDays", {
                have: result.daysWithData,
                window: result.daysInWindow,
              })}
            </p>
          )}
        </div>
      )}
      {result.status === "missing" && (
        <p className="text-muted mt-4 text-sm">
          {t("dashboard.card.unavailable", { reason: reasonText(result.reason) })}
        </p>
      )}
      {result.status === "error" && (
        <p className="text-muted mt-4 text-sm">{t("dashboard.card.unavailableFetch")}</p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted text-xs">{t("dashboard.card.planted")}</dt>
          <dd className="tabular-nums">{season.plantingDate ?? t("dashboard.notSet")}</dd>
        </div>
        <div>
          <dt className="text-muted text-xs">{t("dashboard.card.harvest")}</dt>
          <dd className="tabular-nums">{season.expectedHarvest ?? t("dashboard.notSet")}</dd>
        </div>
      </dl>
    </article>
  )
}
