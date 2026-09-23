import type { BoardSeason } from "@/lib/dashboard/board"
import { toCsv, type CsvColumn } from "@/lib/dashboard/csv"

const COLUMNS: CsvColumn<BoardSeason>[] = [
  { header: "Field", value: (s) => s.fieldName },
  { header: "Crop", value: (s) => s.cropName },
  { header: "Year", value: (s) => s.year },
  { header: "Stage", value: (s) => s.stage },
  { header: "Planting date", value: (s) => s.plantingDate },
  { header: "Expected harvest", value: (s) => s.expectedHarvest },
  { header: "GDD", value: (s) => (s.result.status === "ok" ? Math.round(s.result.total) : null) },
  {
    header: "GDD to maturity",
    value: (s) => (s.result.status === "ok" ? s.result.maturity : null),
  },
  { header: "Progress %", value: (s) => (s.result.status === "ok" ? s.result.pct : null) },
  { header: "Stored pest sightings", value: (s) => s.pestCount },
]

export function ExportButton({ rows, farm }: { rows: BoardSeason[]; farm: string }) {
  function download() {
    const blob = new Blob([toCsv(rows, COLUMNS)], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${farm.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-seasons.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <button type="button" className="btn" onClick={download} disabled={rows.length === 0}>
      Export CSV ({rows.length})
    </button>
  )
}
