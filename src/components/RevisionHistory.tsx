import { Failed, Loading } from "@/components/States"
import { STAGE_LABEL } from "@/components/ui"
import { api } from "@/lib/api"
import { useAsync } from "@/lib/useAsync"

type Entry = {
  rev: string
  timestamp: string
  action: "created" | "updated" | "deleted"
  state: string | null
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
export function RevisionHistory({ id, rev }: { id: string; rev: string }) {
  const state = useAsync(loadHistory, { id, rev })
  if (state.status === "loading" || state.status === "idle") {
    return <Loading what="the revision history" />
  }
  if (state.status === "error") return <Failed what="the revision history" error={state.error} />
  if (state.data.length === 0) return <p className="text-muted text-sm">No revisions recorded.</p>

  return (
    <ol className="divide-line border-line divide-y border-y text-sm">
      {state.data.map((e) => (
        <li key={e.rev} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2.5">
          <time dateTime={e.timestamp} className="font-mono tabular-nums">
            {time(e.timestamp)}
          </time>
          <span className="font-medium">{ACTION[e.action]}</span>
          {e.state && <span className="text-muted">{STAGE_LABEL[e.state] ?? e.state}</span>}
          <span className="text-muted ml-auto font-mono text-xs">{e.rev}</span>
        </li>
      ))}
    </ol>
  )
}
