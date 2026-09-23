import { useEffect, useState } from "react"

export type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "ready"; data: T }

type Settled<T> = { key: string; state: Extract<AsyncState<T>, { status: "error" | "ready" }> }

// Runs `fn(arg)` and reruns when `arg` changes by value; `arg === null` means "not yet" (idle).
// `fn` must be a module-level function so the effect does not rerun each render. A result is
// kept with the argument it belongs to, so a stale result reads as loading, not as data.
export function useAsync<A, T>(fn: (arg: A) => Promise<T>, arg: A | null): AsyncState<T> {
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  const argKey = arg === null ? null : JSON.stringify(arg)

  useEffect(() => {
    if (argKey === null) return
    let cancelled = false
    fn(JSON.parse(argKey) as A).then(
      (data) => !cancelled && setSettled({ key: argKey, state: { status: "ready", data } }),
      (error: Error) =>
        !cancelled && setSettled({ key: argKey, state: { status: "error", error } }),
    )
    return () => {
      cancelled = true
    }
  }, [fn, argKey])

  if (argKey === null) return { status: "idle" }
  if (settled?.key !== argKey) return { status: "loading" }
  return settled.state
}
