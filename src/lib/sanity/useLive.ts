import type { QueryParams, SanityClient } from "@sanity/client"
import { useEffect, useState } from "react"

import { sanity } from "./client"
import { touchesTags } from "./syncTags"

export type LiveState<T> =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "ready"; data: T; live: boolean }

type Settled<T> = {
  key: string
  live: boolean
  state: { status: "error"; error: Error } | { status: "ready"; data: T }
}

// A client whose fetch returns the result as usual but records the sync tags of every query the
// loader runs, and passes the live event id so the CDN serves content at least that fresh.
function taggingClient(lastLiveEventId: string | undefined, tags: Set<string>): SanityClient {
  const client = sanity.withConfig({})
  const fetch = (query: string, params?: QueryParams) =>
    sanity
      .fetch<unknown>(query, params ?? {}, {
        filterResponse: false,
        returnQuery: false,
        lastLiveEventId,
      })
      .then((response) => {
        for (const tag of response.syncTags ?? []) tags.add(tag)
        return response.result
      })
  client.fetch = fetch as SanityClient["fetch"]
  return client
}

// Runs a loader from queries.ts, then subscribes to Sanity's Live Content API and reruns the
// loader when an event names a sync tag its queries returned. `load` must be a module-level
// function so the effect does not rerun each render. Results are kept with the params they
// belong to, so a stale one reads as loading.
export function useLive<P extends QueryParams, T>(
  load: (params: P, client: SanityClient) => Promise<T>,
  params: P,
): LiveState<T> {
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  const key = JSON.stringify(params)

  useEffect(() => {
    const p = JSON.parse(key) as P
    let cancelled = false
    let live = false
    let loaded: ReadonlySet<string> = new Set()

    const setLive = (next: boolean) => {
      live = next
      setSettled((s) => (s?.key === key ? { ...s, live: next } : s))
    }

    const run = (lastLiveEventId?: string) => {
      const tags = new Set<string>()
      return load(p, taggingClient(lastLiveEventId, tags)).then(
        (data) => {
          if (cancelled) return
          loaded = tags
          setSettled({ key, live, state: { status: "ready", data } })
        },
        (error: Error) =>
          !cancelled && setSettled({ key, live, state: { status: "error", error } }),
      )
    }

    void run()
    const sub = sanity.live.events().subscribe({
      next: (event) => {
        if (event.type === "welcome") setLive(true)
        else if (event.type === "reconnect" || event.type === "goaway") setLive(false)
        else if (event.type === "restart") void run(event.id)
        else if (event.type === "message" && touchesTags(event.tags, loaded)) void run(event.id)
      },
      error: (error: Error) =>
        !cancelled && setSettled({ key, live: false, state: { status: "error", error } }),
    })

    return () => {
      cancelled = true
      sub.unsubscribe()
    }
  }, [load, key])

  if (settled?.key !== key) return { status: "loading" }
  return settled.state.status === "ready"
    ? { status: "ready", data: settled.state.data, live: settled.live }
    : settled.state
}
