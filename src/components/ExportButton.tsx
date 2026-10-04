import type { BoardSeason } from "@/lib/dashboard/board"
import { toCsv, type CsvColumn } from "@/lib/dashboard/csv"
import { useI18n } from "@/lib/i18n/store"

export function ExportButton({ rows, farm }: { rows: BoardSeason[]; farm: string }) {
  const { t } = useI18n()
  const columns: CsvColumn<BoardSeason>[] = [
    { header: t("dashboard.csv.field"), value: (s) => s.fieldName },
    { header: t("dashboard.csv.crop"), value: (s) => s.cropName },
    { header: t("dashboard.csv.year"), value: (s) => s.year },
    { header: t("dashboard.csv.stage"), value: (s) => s.stage },
    { header: t("dashboard.csv.planting"), value: (s) => s.plantingDate },
    { header: t("dashboard.csv.harvest"), value: (s) => s.expectedHarvest },
    {
      header: t("dashboard.csv.gdd"),
      value: (s) => (s.result.status === "ok" ? Math.round(s.result.total) : null),
    },
    {
      header: t("dashboard.csv.gddMaturity"),
      value: (s) => (s.result.status === "ok" ? s.result.maturity : null),
    },
    {
      header: t("dashboard.csv.progress"),
      value: (s) => (s.result.status === "ok" ? s.result.pct : null),
    },
    { header: t("dashboard.csv.pests"), value: (s) => s.pestCount },
  ]

  function download() {
    const blob = new Blob([toCsv(rows, columns)], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${farm.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-seasons.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <button type="button" className="btn" onClick={download} disabled={rows.length === 0}>
      {t("dashboard.csv.export", { count: rows.length })}
    </button>
  )
}
