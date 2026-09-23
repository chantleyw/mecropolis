import type { Live, YieldSeries } from "@/lib/public/landingData"

const SOURCE_HREF: Record<string, string> = {
  "USDA PSD": "https://apps.fas.usda.gov/psdonline",
  "HarvestStat Africa": "https://github.com/HarvestStat/HarvestStat-Africa",
  "World Bank": "https://data.worldbank.org",
}

function Series({ series, name }: { series: Live<YieldSeries>; name: string }) {
  if (!series.ok) {
    return (
      <div className="border-line bg-surface-2 rounded-xl border p-4">
        <p className="eyebrow">{name}</p>
        <p className="text-warn mt-2 text-sm">Data unavailable right now ({series.reason}).</p>
      </div>
    )
  }
  const { source, scope, unit, points } = series.data
  const max = Math.max(...points.map((p) => p.kgPerHa), 1)
  return (
    <div className="border-line bg-surface-2 rounded-xl border p-4">
      <p className="eyebrow">{source}</p>
      <h3 className="mt-1 font-semibold">{scope}</h3>
      <ul className="mt-3 space-y-1.5">
        {points.map((p) => (
          <li key={p.year} className="grid grid-cols-[2.5rem_1fr_5rem] items-center gap-2 text-sm">
            <span className="text-muted tabular-nums">{p.year}</span>
            <span className="bg-line h-2 rounded-full">
              <span
                className="bg-sky block h-2 rounded-full"
                style={{ width: `${(p.kgPerHa / max) * 100}%` }}
              />
            </span>
            <span className="text-right tabular-nums">
              {Math.round(p.kgPerHa).toLocaleString("en-US")}{" "}
              <span className="text-muted">{unit}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-muted mt-3 text-xs">
        Source:{" "}
        <a
          className="underline"
          href={SOURCE_HREF[source]}
          rel="noopener noreferrer"
          target="_blank"
        >
          {source}
        </a>
        .
      </p>
    </div>
  )
}

const NAMES = ["USDA PSD", "HarvestStat Africa", "World Bank"]

export function YieldPanel({ yields }: { yields: Live<YieldSeries>[] }) {
  return (
    <div>
      <p className="text-muted mb-4 text-sm">
        The three series measure different things at different scales and are not comparable with
        each other or with any field.
      </p>
      <div className="grid gap-4 lg:grid-cols-3">
        {yields.map((y, i) => (
          <Series key={NAMES[i]} series={y} name={NAMES[i] ?? "Source"} />
        ))}
      </div>
    </div>
  )
}
