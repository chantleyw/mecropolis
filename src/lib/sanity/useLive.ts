import type { QueryParams, SanityClient } from "@sanity/client"
import { useEffect, useState } from "react"

import { sanity, sanityFresh } from "./client"

export type LiveState<T> =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "ready"; data: T; live: boolean }

type Settled<T> = {
  key: string
  live: boolean
  state: { status: "error"; error: Error } | { status: "ready"; data: T }
}

// Runs a loader from queries.ts, then subscribes to Sanity's real-time listener on `listen` (a
// GROQ filter; listeners accept filters, not projections) and reloads from the uncached API on
// every mutation. `load` must be a module-level function so the effect does not rerun each
// render. Results are kept with the params they belong to, so a stale one reads as loading.
export function useLive<P extends QueryParams, T>(
  load: (params: P, client: SanityClient) => Promise<T>,
  params: P,
  listen: string,
): LiveState<T> {
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  const key = `${listen}|${JSON.stringify(params)}`

  useEffect(() => {
    const p = JSON.parse(key.slice(key.indexOf("|") + 1)) as P
    let cancelled = false
    let live = false

    const run = (client: SanityClient) =>
      load(p, client).then(
        (data) => !cancelled && setSettled({ key, live, state: { status: "ready", data } }),
        (error: Error) =>
          !cancelled && setSettled({ key, live, state: { status: "error", error } }),
      )

    void run(sanity)
    const sub = sanity
      .listen(listen, p, { visibility: "query", events: ["welcome", "mutation"] })
      .subscribe({
        next: (event) => {
          if (event.type === "welcome") {
            live = true
            setSettled((s) => (s?.key === key ? { ...s, live: true } : s))
          } else if (event.type === "mutation") {
            void run(sanityFresh)
          }
        },
        error: (error: Error) =>
          !cancelled && setSettled({ key, live: false, state: { status: "error", error } }),
      })

    return () => {
      cancelled = true
      sub.unsubscribe()
    }
  }, [load, listen, key])

  if (settled?.key !== key) return { status: "loading" }
  return settled.state.status === "ready"
    ? { status: "ready", data: settled.state.data, live: settled.live }
    : settled.state
}
