"use client"

import Link from "next/link"
import { useState } from "react"
import { Badge, STAGE_LABEL, STAGE_TONE } from "@/components/ui"
import type { FarmOverview } from "@/lib/sanity/queries"

type Field = FarmOverview["fields"][number]
const COUNTS = [3, 5, 10, "All"] as const
type Count = (typeof COUNTS)[number]

function FieldCard({ f, detailed }: { f: Field; detailed?: boolean }) {
  const pestCount = f.seasons.reduce((n, s) => n + s.pestCount, 0)
  return (
    <article className="card card-lift overflow-hidden">
      <div className="h-1.5" style={{ background: f.colour ?? "var(--brand)" }} />
      <div className="p-5">
        <h3 className="text-lg font-semibold">{f.name}</h3>
        <p className="text-muted text-sm">
          {[f.hectares ? `${f.hectares} ha` : null, f.soilType].filter(Boolean).join(" · ") ||
            "No details"}
        </p>
        <p className="text-muted mt-1 text-xs">
          {pestCount} stored regional pest {pestCount === 1 ? "sighting" : "sightings"}
        </p>
        {detailed && f.coordinates?.lat != null && f.coordinates.lng != null && (
          <p className="text-muted mt-1 text-xs">
            {f.coordinates.lat.toFixed(3)}, {f.coordinates.lng.toFixed(3)}
            {f.ownCoordinates ? " (block position, operator-entered)" : " (farm position)"}
          </p>
        )}
        <ul className="divide-line mt-4 divide-y">
          {f.seasons.map((s) => {
            const stage = s.stage ?? "planning"
            return (
              <li key={s._id}>
                <Link
                  href={`/seasons/${encodeURIComponent(s._id)}`}
                  className="hover:bg-surface-2 -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5"
                >
                  <span className="font-medium">
                    {s.cropName ?? "Unknown crop"}{" "}
                    <span className="text-muted font-normal">{s.year}</span>
                  </span>
                  <Badge tone={STAGE_TONE[stage]}>{STAGE_LABEL[stage] ?? stage}</Badge>
                </Link>
              </li>
            )
          })}
          {f.seasons.length === 0 && <li className="text-muted py-2.5 text-sm">No seasons</li>}
        </ul>
      </div>
    </article>
  )
}

export function FieldExplorer({ fields }: { fields: Field[] }) {
  const [selected, setSelected] = useState<string>("all")
  const [count, setCount] = useState<Count>(5)
  const one = fields.find((f) => f._id === selected)
  const shown = count === "All" ? fields : fields.slice(0, count)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="field-select" className="eyebrow mb-1 block">
            Field
          </label>
          <select
            id="field-select"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="input w-auto min-w-48"
          >
            <option value="all">All fields ({fields.length})</option>
            {fields.map((f) => (
              <option key={f._id} value={f._id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        {!one && fields.length > 3 && (
          <div>
            <span className="eyebrow mb-1 block">Fields in view</span>
            <div role="group" aria-label="Fields in view" className="flex gap-1">
              {COUNTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={count === c}
                  onClick={() => setCount(c)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    count === c
                      ? "from-brand-2 to-brand text-brand-ink bg-gradient-to-b shadow-md"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* The key replays the fade each time the selection changes. */}
      {one ? (
        <div key={one._id} className="rise max-w-xl">
          <FieldCard f={one} detailed />
        </div>
      ) : (
        <div key={`all-${count}`} className="rise grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((f) => (
            <FieldCard key={f._id} f={f} />
          ))}
        </div>
      )}
      {!one && shown.length < fields.length && (
        <p className="text-muted mt-3 text-sm">
          Showing {shown.length} of {fields.length} fields.{" "}
          <button type="button" className="underline" onClick={() => setCount("All")}>
            Show all
          </button>
        </p>
      )}
    </div>
  )
}
