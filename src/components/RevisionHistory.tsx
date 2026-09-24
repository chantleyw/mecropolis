import { useState } from "react"

import { Failed, Loading } from "@/components/States"
import { STAGE_LABEL } from "@/components/ui"
import { api } from "@/lib/api"
import { notesRestoreSchema } from "@/lib/notes"
import { useAsync } from "@/lib/useAsync"

type Entry = {
  rev: string
  timestamp: string
  action: "created" | "updated" | "deleted"
  state: string | null
  notesChanged: boolean
}

const ACTION = { created: "Created", updated: "Updated", deleted: "Deleted" } as const

// `rev` is part of the argument so the list refetches when the live listener delivers a change.
async function loadHistory({ id }: { id: string; rev: string }) {
  const { entries } = await api<{ entries: Entry[] }>(`/api/history?id=${encodeURIComponent(id)}`)
  return entries
}

const time = (iso: string) =>
  new Date(iso).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })

// Content Lake revisions from the Sanity History API, newest first, with the stage each one left.
// Seasons can restore the notes of an earlier revision; the live listener then refreshes the page.
export function RevisionHistory({ id, rev }: { id: string; rev: string }) {
  const state = useAsync(loadHistory, { id, rev })
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function restore(fromRev: string) {
    const parsed = notesRestoreSchema.safeParse({ seasonId: id, rev, fromRev })
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid revision")
    setBusy(fromRev)
    setError(null)
    try {
      await api("/api/notes/restore", { method: "POST", body: parsed.data })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed")
    } finally {
      setBusy(null)
    }
  }

  if (state.status === "loading" || state.status === "idle") {
    return <Loading what="the revision history" />
  }
  if (state.status === "error") return <Failed what="the revision history" error={state.error} />
  if (state.data.length === 0) return <p className="text-muted text-sm">No revisions recorded.</p>

  // The newest entry that changed the notes holds the current notes, so it has nothing to restore.
  const current = state.data.find((e) => e.notesChanged)?.rev
  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-warn text-sm">
          {error}
        </p>
      )}
      <ol className="divide-line border-line divide-y border-y text-sm">
        {state.data.map((e) => (
          <li key={e.rev} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2.5">
            <time dateTime={e.timestamp} className="font-mono tabular-nums">
              {time(e.timestamp)}
            </time>
            <span className="font-medium">{ACTION[e.action]}</span>
            {e.state && <span className="text-muted">{STAGE_LABEL[e.state] ?? e.state}</span>}
            {e.notesChanged && <span className="text-muted">Notes changed</span>}
            <span className="text-muted ml-auto font-mono text-xs">{e.rev}</span>
            {e.notesChanged && e.rev !== current && (
              <button
                type="button"
                className="btn"
                disabled={busy !== null}
                onClick={() => restore(e.rev)}
              >
                {busy === e.rev ? "Restoring..." : "Restore these notes"}
              </button>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
