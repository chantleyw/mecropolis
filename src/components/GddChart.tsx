import type { GddPoint } from "@/lib/agronomy/gdd"

interface Props {
  points: GddPoint[]
  emergence: number
  maturity: number
}

const W = 640
const H = 220
const PAD = { l: 44, r: 12, t: 12, b: 26 }

// Cumulative GDD against the model's emergence and maturity thresholds.
export function GddChart({ points, emergence, maturity }: Props) {
  if (points.length === 0) return null
  const top = Math.max(maturity, points.at(-1)?.cumulative ?? 0) * 1.05
  const x = (i: number) => PAD.l + (i / Math.max(points.length - 1, 1)) * (W - PAD.l - PAD.r)
  const y = (v: number) => H - PAD.b - (v / top) * (H - PAD.t - PAD.b)
  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.cumulative).toFixed(1)}`)
    .join(" ")
  const area = `${line} L${x(points.length - 1).toFixed(1)},${y(0)} L${x(0)},${y(0)} Z`
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round((top * f) / 100) * 100)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Cumulative growing degree days against emergence and maturity thresholds"
      className="h-auto w-full"
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--line)" />
          <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">
            {t}
          </text>
        </g>
      ))}
      {[
        { v: emergence, label: "Emergence", color: "var(--sky)" },
        { v: maturity, label: "Maturity", color: "var(--heat)" },
      ].map((m) => (
        <g key={m.label}>
          <line
            x1={PAD.l}
            x2={W - PAD.r}
            y1={y(m.v)}
            y2={y(m.v)}
            stroke={m.color}
            strokeDasharray="5 4"
          />
          <text x={W - PAD.r} y={y(m.v) - 5} textAnchor="end" fontSize="10" fill={m.color}>
            {m.label} {m.v}
          </text>
        </g>
      ))}
      <defs>
        <linearGradient id="gdd-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--brand-2)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gdd-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--sky)" />
          <stop offset="1" stopColor="var(--brand-2)" />
        </linearGradient>
        <filter id="gdd-glow" x="-5%" y="-20%" width="110%" height="140%">
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="3"
            floodColor="var(--brand)"
            floodOpacity="0.45"
          />
        </filter>
      </defs>
      <path d={area} fill="url(#gdd-area)" />
      <path
        d={line}
        fill="none"
        stroke="url(#gdd-line)"
        strokeWidth="3.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        filter="url(#gdd-glow)"
      />
      <text x={PAD.l} y={H - 6} fontSize="10" fill="var(--muted)">
        {points[0]?.date}
      </text>
      <text x={W - PAD.r} y={H - 6} textAnchor="end" fontSize="10" fill="var(--muted)">
        {points.at(-1)?.date}
      </text>
    </svg>
  )
}
