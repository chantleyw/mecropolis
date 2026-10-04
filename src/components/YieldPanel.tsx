import { useI18n } from "@/lib/i18n/store"
import type { Live, YieldSeries } from "@/lib/public/landingData"

const SOURCE_HREF: Record<string, string> = {
  "USDA PSD": "https://apps.fas.usda.gov/psdonline",
  "HarvestStat Africa": "https://github.com/HarvestStat/HarvestStat-Africa",
  "World Bank": "https://data.worldbank.org",
}

function Series({ series, name }: { series: Live<YieldSeries>; name: string }) {
  const { t, dateLocale } = useI18n()
  if (!series.ok) {
    return (
      <div className="border-line border-t py-4">
        <h3 className="font-semibold">{name}</h3>
        <p className="text-warn mt-2 text-sm">
          {t("public.yield.unavailable", { reason: series.reason })}
        </p>
      </div>
    )
  }
  const { source, scope, unit, points } = series.data
  const max = Math.max(...points.map((p) => p.kgPerHa), 1)
  return (
    <div className="border-line border-t py-4">
      <h3 className="font-semibold">{scope}</h3>
      <ul className="mt-3 space-y-1.5">
        {points.map((p) => (
          <li key={p.year} className="grid grid-cols-[2.5rem_1fr_5rem] items-center gap-2 text-sm">
            <span className="text-muted tabular-nums">{p.year}</span>
            <span className="bg-surface-2 h-2.5 rounded-[1px]">
              <span
                className="bg-ink block h-2.5 rounded-[1px]"
                style={{ width: `${(p.kgPerHa / max) * 100}%` }}
              />
            </span>
            <span className="text-right tabular-nums">
              {Math.round(p.kgPerHa).toLocaleString(dateLocale("en-US"))}{" "}
              <span className="text-muted">{unit}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-muted mt-3 text-xs">
        {t("public.yield.sourceBefore")}{" "}
        <a
          className="underline"
          href={SOURCE_HREF[source]}
          rel="noopener noreferrer"
          target="_blank"
        >
          {source}
        </a>
        {t("public.yield.sourceAfter")}
      </p>
    </div>
  )
}

const NAMES = ["USDA PSD", "HarvestStat Africa", "World Bank"]

export function YieldPanel({ yields }: { yields: Live<YieldSeries>[] }) {
  const { t } = useI18n()
  return (
    <div>
      <p className="text-muted mb-4 text-sm">{t("public.yield.lead")}</p>
      <div className="grid gap-x-10 lg:grid-cols-3">
        {yields.map((y, i) => (
          <Series key={NAMES[i]} series={y} name={NAMES[i] ?? t("public.yield.source")} />
        ))}
      </div>
    </div>
  )
}
