"use client"

import { useState } from "react"
import type { BoardSeason } from "@/lib/dashboard/board"

const MAX = 4
const COLORS = ["var(--brand)", "var(--heat)", "var(--sky)", "var(--warn)"]
const W = 640
const H = 240
const PAD = { l: 44, r: 12, t: 12, b: 26 }

// Overlays cumulative GDD from planting for the chosen seasons, on a shared day axis.
export function CompareFields({ seasons }: { seasons: BoardSeason[] }) {
  const usable = seasons.filter((s) => s.curve.length > 0)
  const [picked, setPicked] = useState<string[]>(usable.slice(0, 2).map((s) => s.id))
  if (usable.length < 2) {
    return (
      <p className="text-muted text-sm">
        Comparison needs two seasons with GDD data. Seasons without a planting date or crop model
        are left out.
      </p>
    )
  }
  const chosen = usable.filter((s) => picked.includes(s.id))
  const days = Math.max(...chosen.map((s) => s.curve.length), 2)
  const top = Math.max(
    ...chosen.flatMap((s) => [
      s.curve.at(-1) ?? 0,
      s.result.status === "ok" ? s.result.maturity : 0,
    ]),
    100,
  )
  const x = (i: number) => PAD.l + (i / (days - 1)) * (W - PAD.l - PAD.r)
  const y = (v: number) => H - PAD.b - (v / top) * (H - PAD.t - PAD.b)
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((v) => v !== id) : p.length < MAX ? [...p, id] : p))

  return (
    <div>
      <ul className="mb-4 flex flex-wrap gap-2" aria-label="Seasons to compare">
        {usable.map((s) => {
          const on = picked.includes(s.id)
          return (
            <li key={s.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(s.id)}
                className={`rounded-full border px-3 py-1 text-sm ${on ? "border-brand bg-brand-soft text-brand" : "border-line text-muted"}`}
              >
                {s.fieldName} · {s.cropName ?? "Crop"} {s.year}
              </button>
            </li>
          )
        })}
      </ul>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Cumulative growing degree days since planting for the selected seasons"
        className="h-auto w-full"
      >
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(top * f)} y2={y(top * f)} stroke="var(--line)" />
            <text
              x={PAD.l - 8}
              y={y(top * f) + 4}
              textAnchor="end"
              fontSize="10"
              fill="var(--muted)"
            >
              {Math.round(top * f)}
            </text>
          </g>
        ))}
        {chosen.map((s) => {
          const i = picked.indexOf(s.id)
          const path = s.curve
            .map((v, d) => `${d === 0 ? "M" : "L"}${x(d).toFixed(1)},${y(v).toFixed(1)}`)
            .join(" ")
          return (
            <path
              key={s.id}
              d={path}
              fill="none"
              stroke={COLORS[i % COLORS.length]}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )
        })}
        <text x={PAD.l} y={H - 6} fontSize="10" fill="var(--muted)">
          Planting
        </text>
        <text x={W - PAD.r} y={H - 6} textAnchor="end" fontSize="10" fill="var(--muted)">
          Day {days - 1}
        </text>
      </svg>
      <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {chosen.map((s) => (
          <li key={s.id} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: COLORS[picked.indexOf(s.id) % COLORS.length] }}
            />
            {s.fieldName}:{" "}
            {s.result.status === "ok"
              ? `${Math.round(s.result.total)} GDD, ${s.result.pct}%`
              : "n/a"}
          </li>
        ))}
      </ul>
      <p className="text-muted mt-3 text-xs">
        Curves start at each planting date, so seasons planted on different days are aligned by day
        since planting, not by calendar date. Up to {MAX} at once.
      </p>
    </div>
  )
}
