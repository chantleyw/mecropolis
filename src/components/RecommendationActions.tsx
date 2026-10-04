import { useState } from "react"

import type { MessageKey } from "@/lib/i18n/en"
import { useI18n } from "@/lib/i18n/store"
import { TRANSITIONS, type RecommendationStatus } from "@/lib/recommendations/machine"

const TARGET: Partial<Record<RecommendationStatus, { action: string; label: MessageKey }>> = {
  approved: { action: "approve", label: "dashboard.rec.action.approve" },
  rejected: { action: "reject", label: "dashboard.rec.action.reject" },
  completed: { action: "complete", label: "dashboard.rec.action.complete" },
}

// Derived from the shared state machine so the app UI, the API and the Studio action agree.
const ACTIONS: Record<string, { action: string; label: MessageKey }[]> = Object.fromEntries(
  Object.entries(TRANSITIONS)
    .map(
      ([from, targets]) =>
        [from, targets.map((to) => TARGET[to]).filter((a) => a !== undefined)] as const,
    )
    .filter(([, actions]) => actions.length > 0),
)

// Status changes go through the recommendation routes; failures are shown, not hidden.
export function RecommendationActions({
  id,
  status,
  onDone,
}: {
  id: string
  status: string
  onDone: () => void
}) {
  const { t } = useI18n()
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const actions = ACTIONS[status]
  if (!actions) return null

  async function run(action: string) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/recommendations/${encodeURIComponent(id)}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(note.trim() ? { decisionNote: note.trim() } : {}),
      })
      const data: { error?: string; reason?: string } = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(
          `${data.error ?? t("common.requestFailed")}${data.reason ? `: ${data.reason}` : ""}`,
        )
      } else {
        setNote("")
        onDone()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.requestFailed"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <label className="text-muted text-xs" htmlFor={`note-${id}`}>
        {t("dashboard.rec.note")}
      </label>
      <textarea
        id={`note-${id}`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={2000}
        rows={2}
        className="border-line bg-surface rounded-md border p-2 text-sm"
      />
      <div className="flex flex-wrap items-center gap-3">
        {actions.map((a) => (
          <button
            key={a.action}
            type="button"
            disabled={busy}
            onClick={() => run(a.action)}
            className={a.action === "approve" ? "btn btn-primary" : "btn"}
          >
            {busy ? t("common.working") : t(a.label)}
          </button>
        ))}
        {error && (
          <span role="alert" className="text-warn text-sm">
            {error}
          </span>
        )}
      </div>
    </div>
  )
}
