/**
 * Best-effort sliding-window limiter. State is per server instance, so on
 * serverless it bounds bursts per warm instance, not globally.
 */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>()

  return function allow(key: string, now: number = Date.now()): boolean {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
    if (recent.length >= limit) {
      hits.set(key, recent)
      return false
    }
    recent.push(now)
    hits.set(key, recent)
    return true
  }
}
