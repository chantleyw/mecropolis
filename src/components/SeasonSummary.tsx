import { useState } from "react"

import { Badge } from "@/components/ui"
import { api } from "@/lib/api"
import { dateLocale, useI18n } from "@/lib/i18n/store"

type Summary = { text?: string | null; generatedAt?: string | null } | null

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString(dateLocale("en-ZA"), { dateStyle: "medium", timeStyle: "short" })

// Digest of this season's stored records, written by Sanity Agent Actions through /api/summary.
// It is labelled as AI-generated and is never advice; the live listener shows the stored result.
// Each run spends one org AI credit and counts against a shared hourly cap, so it runs on click only.
export function SeasonSummary({ seasonId, summary }: { seasonId: string; summary: Summary }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setBusy(true)
    setError(null)
    try {
      await api("/api/summary", { method: "POST", body: { seasonId } })
    } catch (err) {
      setError(err instanceof Error ? err.message : t("season.summary.failed"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      {summary?.text ? (
        <>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <Badge tone="sky">{t("season.summary.badge")}</Badge>
            {summary.generatedAt && (
              <time dateTime={summary.generatedAt} className="text-muted">
                {formatTime(summary.generatedAt)}
              </time>
            )}
          </p>
          <p className="whitespace-pre-line">{summary.text}</p>
          <p className="text-muted text-xs">{t("season.summary.disclaimer")}</p>
        </>
      ) : (
        <p className="text-muted text-sm">{t("season.summary.none")}</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={generate} disabled={busy} className="btn">
          {busy
            ? t("season.summary.working")
            : summary?.text
              ? t("season.summary.regenerate")
              : t("season.summary.generate")}
        </button>
        {error && (
          <span role="alert" className="text-warn text-sm">
            {error}
          </span>
        )}
      </div>
    </div>
  )
}
