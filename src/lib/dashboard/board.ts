import type { ProgressResult } from "@/lib/dashboard/progress"
import type { Photo } from "@/lib/sanity/image"

export type BoardResult =
  | {
      status: "ok"
      total: number
      maturity: number
      pct: number
      daysWithData: number
      daysInWindow: number
    }
  | { status: "missing"; reason: string }
  | { status: "error" }

export interface BoardSeason {
  id: string
  cropName: string | null
  year: number
  fieldId: string
  fieldName: string
  colour: string | null
  photo: Photo | null
  stage: string | null
  plantingDate: string | null
  expectedHarvest: string | null
  pestCount: number
  result: BoardResult
  /** Cumulative GDD per day since planting, for the comparison chart. */
  curve: number[]
}

export function toBoardResult(r: ProgressResult): BoardResult {
  if (r.status !== "ok") return r
  const { total, maturity, pct, daysWithData, daysInWindow } = r.progress
  return { status: "ok", total, maturity, pct, daysWithData, daysInWindow }
}

export const curveOf = (r: ProgressResult): number[] =>
  r.status === "ok" ? r.progress.running.map((p) => Math.round(p.cumulative)) : []

export const SORTS = ["Progress", "Planting date", "Field", "Stage"] as const
export type SortKey = (typeof SORTS)[number]

const STAGE_RANK: Record<string, number> = {
  planning: 0,
  planted: 1,
  growing: 2,
  "pre-harvest": 3,
  harvested: 4,
  review: 5,
}
const pctOf = (s: BoardSeason) => (s.result.status === "ok" ? s.result.pct : -1)

export function filterSeasons(
  seasons: BoardSeason[],
  query: string,
  stages: ReadonlySet<string>,
  fieldId: string | null,
): BoardSeason[] {
  const q = query.trim().toLowerCase()
  return seasons.filter(
    (s) =>
      stages.has(s.stage ?? "planning") &&
      (fieldId === null || s.fieldId === fieldId) &&
      (q === "" || `${s.fieldName} ${s.cropName ?? ""}`.toLowerCase().includes(q)),
  )
}

export function sortSeasons(seasons: BoardSeason[], key: SortKey): BoardSeason[] {
  const out = [...seasons]
  out.sort((a, b) => {
    switch (key) {
      case "Progress":
        return pctOf(b) - pctOf(a)
      case "Planting date":
        return (a.plantingDate ?? "9999").localeCompare(b.plantingDate ?? "9999")
      case "Field":
        return a.fieldName.localeCompare(b.fieldName)
      case "Stage":
        return (STAGE_RANK[a.stage ?? "planning"] ?? 0) - (STAGE_RANK[b.stage ?? "planning"] ?? 0)
    }
  })
  return out
}

/** Grid columns for the visible card count: three or fewer keep the standard layout. */
export function gridClass(visible: number): string {
  if (visible >= 5) return "md:grid-cols-2 lg:grid-cols-5"
  if (visible === 4) return "md:grid-cols-2 lg:grid-cols-4"
  return "md:grid-cols-2 lg:grid-cols-3"
}
