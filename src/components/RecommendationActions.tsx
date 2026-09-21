"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

const ACTIONS: Record<string, { action: string; label: string }[]> = {
  proposed: [
    { action: "approve", label: "Approve" },
    { action: "reject", label: "Reject" },
  ],
  approved: [{ action: "complete", label: "Mark completed" }],
}

// Status changes go through the recommendation routes; failures are shown, not hidden.
export function RecommendationActions({ id, status }: { id: string; status: string }) {
  const router = useRouter()
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
        setError(`${data.error ?? "Request failed"}${data.reason ? `: ${data.reason}` : ""}`)
      } else {
        router.refresh()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <label className="text-muted text-xs" htmlFor={`note-${id}`}>
        Decision note (optional)
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
            {busy ? "Working..." : a.label}
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
