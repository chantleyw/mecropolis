import type { QueryParams } from "@sanity/client"
import { useEffect, useState } from "react"

import { sanity, sanityFresh } from "./client"

export type LiveQueryState<T> =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "ready"; data: T; live: boolean; updatedAt: number }

// Fetches a GROQ query, then subscribes to Sanity's real-time listener for documents matching
// the same filter and refetches whenever one changes. `listenQuery` is the filter to listen on
// (listeners accept filters, not projections).
export function useLiveQuery<T>(query: string, listenQuery: string, params: QueryParams = {}): LiveQueryState<T> {
  const [state, setState] = useState<LiveQueryState<T>>({ status: "loading" })
  const paramsKey = JSON.stringify(params)

  useEffect(() => {
    const p = JSON.parse(paramsKey) as QueryParams
    let cancelled = false
    let live = false

    const load = (client: typeof sanity) =>
      client.fetch<T>(query, p).then(
        (data) => !cancelled && setState({ status: "ready", data, live, updatedAt: Date.now() }),
        (error: Error) => !cancelled && setState({ status: "error", error }),
      )

    void load(sanity)
    const sub = sanity
      .listen(listenQuery, p, { visibility: "query", events: ["welcome", "mutation"] })
      .subscribe({
        next: (event) => {
          if (event.type === "welcome") {
            live = true
            setState((s) => (s.status === "ready" ? { ...s, live: true } : s))
          } else if (event.type === "mutation") {
            void load(sanityFresh)
          }
        },
        error: (error: Error) => !cancelled && setState({ status: "error", error }),
      })

    return () => {
      cancelled = true
      sub.unsubscribe()
    }
  }, [query, listenQuery, paramsKey])

  return state
}
