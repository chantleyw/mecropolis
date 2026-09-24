import { useState } from "react"

import { Failed, Loading } from "@/components/States"
import { STAGE_LABEL } from "@/components/ui"
import { api } from "@/lib/api"
import { formatNoteTime, notesRestoreSchema } from "@/lib/notes"
import { useAsync } from "@/lib/useAsync"

type NoteChange = {
  key: string
  change: "added" | "edited" | "deleted"
  title: string
  restoreFrom: string | null
}

type Entry = {
  rev: string
  timestamp: string
  action: "created" | "updated" | "deleted"
  state: string | null
  notes: NoteChange[]
}

const ACTION = { created: "Created", updated: "Updated", deleted: "Deleted" } as const
const CHANGE = { added: "Added note", edited: "Edited note", deleted: "Deleted note" } as const

// `rev` is part of the argument so the list refetches when the live listener delivers a change.
async function loadHistory({ id }: { id: string; rev: string }) {
  const { entries } = await api<{ entries: Entry[] }>(`/api/history?id=${encodeURIComponent(id)}`)
  return entries
}

// Content Lake revisions from the Sanity History API, newest first, with the stage each one left
// and the season notes it changed. A changed note can be put back as that revision left it (or, for
// a delete, as it was just before); other notes stay as they are. The live listener then refreshes
// the page.
export function RevisionHistory({ id, rev }: { id: string; rev: string }) {
  const state = useAsync(loadHistory, { id, rev })
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function restore(change: NoteChange, entryRev: string) {
    if (!change.restoreFrom) return
    const parsed = notesRestoreSchema.safeParse({
      seasonId: id,
      rev,
      fromRev: change.restoreFrom,
      key: change.key,
    })
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid revision")
    setBusy(`${entryRev}:${change.key}`)
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

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-warn text-sm">
          {error}
        </p>
      )}
      <ol className="divide-line border-line divide-y border-y text-sm">
        {state.data.map((e) => (
          <li key={e.rev} className="space-y-2 py-2.5">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <time dateTime={e.timestamp} className="font-mono tabular-nums">
                {formatNoteTime(e.timestamp)}
              </time>
              <span className="font-medium">{ACTION[e.action]}</span>
              {e.state && <span className="text-muted">{STAGE_LABEL[e.state] ?? e.state}</span>}
              <span className="text-muted ml-auto font-mono text-xs">{e.rev}</span>
            </div>
            {e.notes.length > 0 && (
              <ul className="space-y-2 pl-4">
                {e.notes.map((n) => (
                  <li key={n.key} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-muted">{CHANGE[n.change]}</span>
                    <span className="min-w-0 truncate">{n.title || "(empty)"}</span>
                    {n.restoreFrom && (
                      <button
                        type="button"
                        className="btn ml-auto"
                        disabled={busy !== null}
                        onClick={() => restore(n, e.rev)}
                      >
                        {busy === `${e.rev}:${n.key}`
                          ? "Restoring..."
                          : n.change === "deleted"
                            ? "Restore this note"
                            : "Restore this version"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
