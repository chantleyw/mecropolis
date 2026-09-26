import { useState } from "react"

import { Badge } from "@/components/ui"
import { api } from "@/lib/api"

type Summary = { text?: string | null; generatedAt?: string | null } | null

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })

// Digest of this season's stored records, written by Sanity Agent Actions through /api/summary.
// It is labelled as AI-generated and is never advice; the live listener shows the stored result.
// Each run spends one org AI credit and counts against a shared hourly cap, so it runs on click only.
export function SeasonSummary({ seasonId, summary }: { seasonId: string; summary: Summary }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setBusy(true)
    setError(null)
    try {
      await api("/api/summary", { method: "POST", body: { seasonId } })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Summary failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      {summary?.text ? (
        <>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <Badge tone="sky">AI-generated from this season&apos;s records</Badge>
            {summary.generatedAt && (
              <time dateTime={summary.generatedAt} className="text-muted">
                {formatTime(summary.generatedAt)}
              </time>
            )}
          </p>
          <p className="whitespace-pre-line">{summary.text}</p>
          <p className="text-muted text-xs">
            Summarises the notes, observations, treatments and GDD figures stored here. Not
            agronomic advice and not validated; check it against the records below.
          </p>
        </>
      ) : (
        <p className="text-muted text-sm">
          No summary yet. Generating one sends this season&apos;s stored records to Sanity Agent
          Actions.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={generate} disabled={busy} className="btn">
          {busy ? "Summarising..." : summary?.text ? "Regenerate summary" : "Generate summary"}
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
