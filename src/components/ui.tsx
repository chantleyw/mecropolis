import type { ReactNode } from "react"

type Tone = "brand" | "heat" | "sky" | "warn" | "neutral"

const TONES: Record<Tone, string> = {
  brand: "bg-brand-soft text-brand",
  heat: "bg-heat-soft text-heat",
  sky: "bg-sky-soft text-sky",
  warn: "bg-warn-soft text-warn",
  neutral: "bg-surface-2 text-muted border border-line",
}

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-muted mt-0.5 text-xs">{hint}</p>}
    </div>
  )
}

export function Section({
  title,
  aside,
  children,
}: {
  title: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

export const STAGE_TONE: Record<string, Tone> = {
  planning: "neutral",
  planted: "sky",
  growing: "brand",
  "pre-harvest": "heat",
  harvested: "heat",
  review: "neutral",
}

export const STAGE_LABEL: Record<string, string> = {
  planning: "Planning",
  planted: "Planted",
  growing: "Growing",
  "pre-harvest": "Pre-harvest",
  harvested: "Thermal maturity",
  review: "Review",
}
