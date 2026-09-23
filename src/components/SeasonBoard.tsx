import { useState } from "react"
import { CompareFields } from "@/components/CompareFields"
import { ExportButton } from "@/components/ExportButton"
import { SeasonProgressCard } from "@/components/SeasonProgressCard"
import { STAGE_LABEL } from "@/components/ui"
import {
  filterSeasons,
  gridClass,
  SORTS,
  sortSeasons,
  type BoardSeason,
  type SortKey,
} from "@/lib/dashboard/board"

const CAPS = [3, 4, 5] as const
type Cap = (typeof CAPS)[number]
const MAX_VIEW = 5

// The cap keeps at most five cards in view; the grid resizes to the visible count.
export function SeasonBoard({ seasons, farm }: { seasons: BoardSeason[]; farm: string }) {
  const stagesPresent = [...new Set(seasons.map((s) => s.stage ?? "planning"))]
  const [query, setQuery] = useState("")
  const [stages, setStages] = useState<Set<string>>(new Set(stagesPresent))
  const [sort, setSort] = useState<SortKey>("Progress")
  const [cap, setCap] = useState<Cap>(5)
  const [compare, setCompare] = useState(false)

  const matching = sortSeasons(filterSeasons(seasons, query, stages, null), sort)
  const visible = matching.slice(0, Math.min(cap, MAX_VIEW))
  const toggleStage = (s: string) =>
    setStages((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="min-w-48 flex-1">
          <label htmlFor="season-search" className="eyebrow mb-1 block">
            Search
          </label>
          <input
            id="season-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Field or crop"
            className="input"
          />
        </div>
        <div>
          <label htmlFor="season-sort" className="eyebrow mb-1 block">
            Sort by
          </label>
          <select
            id="season-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="input w-auto"
          >
            {SORTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <span className="eyebrow mb-1 block">Cards in view</span>
          <div role="group" aria-label="Cards in view" className="flex gap-1">
            {CAPS.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={cap === c}
                onClick={() => setCap(c)}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  cap === c
                    ? "from-brand-2 to-brand text-brand-ink bg-gradient-to-b shadow-md"
                    : "text-muted hover:text-ink"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <ExportButton rows={matching} farm={farm} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Stages">
        {stagesPresent.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={stages.has(s)}
            onClick={() => toggleStage(s)}
            className={`rounded-full border px-3 py-1 text-sm ${
              stages.has(s) ? "border-brand bg-brand-soft text-brand" : "border-line text-muted"
            }`}
          >
            {STAGE_LABEL[s] ?? s}
          </button>
        ))}
      </div>

      {matching.length === 0 ? (
        <p className="card text-muted p-6">No seasons match these filters.</p>
      ) : (
        <div
          key={`${visible.length}-${sort}-${query}`}
          className={`rise grid gap-4 ${gridClass(visible.length)}`}
        >
          {visible.map((s) => (
            <SeasonProgressCard key={s.id} season={s} compact={visible.length >= 5} />
          ))}
        </div>
      )}
      {visible.length < matching.length && (
        <p className="text-muted mt-3 text-sm">
          Showing {visible.length} of {matching.length}. Narrow with search or the stage filters to
          see the rest.
        </p>
      )}

      <div className="mt-6">
        <button
          type="button"
          className="btn"
          aria-expanded={compare}
          onClick={() => setCompare((c) => !c)}
        >
          {compare ? "Hide comparison" : "Compare seasons"}
        </button>
        {compare && (
          <div className="card rise mt-4 p-5">
            <CompareFields seasons={matching} />
          </div>
        )}
      </div>
    </div>
  )
}
