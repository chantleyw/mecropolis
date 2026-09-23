// In-memory replacement for Next's unstable_cache. Entries are keyed by the JSON of the
// arguments and live for `ttlMs`. Only fulfilled results are kept: a rejection evicts the entry,
// so the next call retries and an error is never served from the cache. Concurrent callers share
// one in-flight promise.
export function ttlCache<A extends unknown[], T>(
  load: (...args: A) => Promise<T>,
  ttlMs: number,
  now: () => number = Date.now,
): (...args: A) => Promise<T> {
  const entries = new Map<string, { expires: number; value: Promise<T> }>()
  return (...args: A) => {
    const key = JSON.stringify(args)
    const hit = entries.get(key)
    if (hit && hit.expires > now()) return hit.value
    const value = load(...args)
    entries.set(key, { expires: now() + ttlMs, value })
    value.catch(() => {
      if (entries.get(key)?.value === value) entries.delete(key)
    })
    return value
  }
}
