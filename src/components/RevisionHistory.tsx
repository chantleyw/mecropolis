import { useState } from "react"

import { Failed, Loading } from "@/components/States"
import { stageLabel } from "@/components/ui"
import { api } from "@/lib/api"
import { useI18n } from "@/lib/i18n/store"
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
  const { t, dateLocale } = useI18n()
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
    if (!parsed.success)
      return setError(parsed.error.issues[0]?.message ?? t("season.history.invalidRevision"))
    setBusy(`${entryRev}:${change.key}`)
    setError(null)
    try {
      await api("/api/notes/restore", { method: "POST", body: parsed.data })
    } catch (e) {
      setError(e instanceof Error ? e.message : t("season.history.restoreFailed"))
    } finally {
      setBusy(null)
    }
  }

  if (state.status === "loading" || state.status === "idle") {
    return <Loading what={t("season.history.loading")} />
  }
  if (state.status === "error")
    return <Failed what={t("season.history.loading")} error={state.error} />
  if (state.data.length === 0)
    return <p className="text-muted text-sm">{t("season.history.none")}</p>

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
                {formatNoteTime(e.timestamp, dateLocale("en-ZA"))}
              </time>
              <span className="font-medium">{t(`season.history.action.${e.action}` as const)}</span>
              {e.state && <span className="text-muted">{stageLabel(e.state)}</span>}
              <span className="text-muted ml-auto font-mono text-xs">{e.rev}</span>
            </div>
            {e.notes.length > 0 && (
              <ul className="space-y-2 pl-4">
                {e.notes.map((n) => (
                  <li key={n.key} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-muted">
                      {t(`season.history.change.${n.change}` as const)}
                    </span>
                    <span className="min-w-0 truncate">
                      {n.title || t("season.history.emptyTitle")}
                    </span>
                    {n.restoreFrom && (
                      <button
                        type="button"
                        className="btn ml-auto"
                        disabled={busy !== null}
                        onClick={() => restore(n, e.rev)}
                      >
                        {busy === `${e.rev}:${n.key}`
                          ? t("season.history.restoring")
                          : n.change === "deleted"
                            ? t("season.history.restoreNote")
                            : t("season.history.restoreVersion")}
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
