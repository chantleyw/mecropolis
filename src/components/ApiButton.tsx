import { useState } from "react"

import { stageLabel } from "@/components/ui"
import { t, useI18n } from "@/lib/i18n/store"

interface Props {
  label: string
  url: string
  body: Record<string, string>
  primary?: boolean
}

function successText(data: {
  status?: string
  stage?: string
  blockedBy?: string | null
  reports?: number
}) {
  if (data.reports !== undefined) return t("api.sightingsStored", { count: data.reports })
  if (data.blockedBy) return t("api.blocked", { reason: data.blockedBy })
  if (data.status === "advanced" && data.stage)
    return t("api.advancedTo", { stage: stageLabel(data.stage) })
  return t("api.upToDate")
}

// POSTs to a Pages Function; the live Sanity listener picks up the change. Failures are shown, not hidden.
export function ApiButton({ label, url, body, primary }: Props) {
  useI18n()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

  async function run() {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      const data: {
        error?: string
        reason?: string
        status?: string
        stage?: string
        blockedBy?: string | null
        reports?: number
      } = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage({
          text: `${data.error ?? t("common.requestFailed")}${data.reason ? `: ${data.reason}` : ""}`,
          error: true,
        })
      } else {
        setMessage({ text: successText(data), error: false })
      }
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : t("common.requestFailed"), error: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className={primary ? "btn btn-primary" : "btn"}
      >
        {busy ? t("common.working") : label}
      </button>
      {message && (
        <span role="status" className={`text-sm ${message.error ? "text-warn" : "text-muted"}`}>
          {message.text}
        </span>
      )}
    </div>
  )
}
