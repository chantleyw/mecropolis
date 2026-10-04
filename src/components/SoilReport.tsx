import { useState } from "react"

import { apiUpload } from "@/lib/api"
import { useI18n } from "@/lib/i18n/store"
import { safeHttpUrl } from "@/lib/safeUrl"

const MAX_BYTES = 10 * 1024 * 1024

export type StoredReport = {
  url: string | null
  originalFilename: string | null
  size: number | null
} | null

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// The server accepts plain names ending in .pdf; anything else is replaced so the upload is not
// refused over the name alone.
function plainName(name: string): string {
  const base = name
    .replace(/\.pdf$/i, "")
    .replace(/[^\w .()-]/g, "-")
    .slice(0, 90)
  return `${base || "soil-report"}.pdf`
}

type Message = { text: string; error: boolean } | null

// The field's lab soil test, stored in Sanity as a file asset. Uploading a new PDF replaces it.
export function SoilReport({ fieldId, report }: { fieldId: string; report: StoredReport }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<Message>(null)
  const href = safeHttpUrl(report?.url)
  const name = report?.originalFilename ?? "soil-report.pdf"

  async function choose(input: HTMLInputElement) {
    const file = input.files?.[0]
    input.value = ""
    if (!file) return
    if (file.type !== "application/pdf") {
      setMessage({ text: t("season.soil.chooseFile"), error: true })
      return
    }
    if (file.size > MAX_BYTES) {
      setMessage({ text: t("season.soil.tooBig"), error: true })
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      const q = new URLSearchParams({ fieldId, kind: "soilReport", name: plainName(file.name) })
      await apiUpload(`/api/assets?${q}`, file)
      setMessage({ text: t("season.soil.saved"), error: false })
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : t("season.uploadFailed"), error: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      {href ? (
        <p className="text-sm">
          <a href={`${href}?dl=${encodeURIComponent(name)}`} className="font-medium underline">
            {name}
          </a>
          {report?.size != null && <span className="text-muted"> ({formatSize(report.size)})</span>}
        </p>
      ) : (
        <p className="text-muted text-sm">{t("season.soil.none")}</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label className={`btn ${busy ? "pointer-events-none opacity-60" : "cursor-pointer"}`}>
          {busy ? t("season.uploading") : href ? t("season.soil.replace") : t("season.soil.upload")}
          <input
            type="file"
            accept="application/pdf"
            className="sr-only"
            disabled={busy}
            onChange={(e) => void choose(e.currentTarget)}
          />
        </label>
        {message && (
          <span
            role={message.error ? "alert" : "status"}
            className={`text-sm ${message.error ? "text-warn" : "text-muted"}`}
          >
            {message.text}
          </span>
        )}
      </div>
    </div>
  )
}
