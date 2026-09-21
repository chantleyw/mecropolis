/**
 * Best-effort sliding-window limiter. State is per server instance, so on
 * serverless it bounds bursts per warm instance, not globally.
 */
const SWEEP_EVERY = 100

export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>()
  let calls = 0

  return function allow(key: string, now: number = Date.now()): boolean {
    // Periodically drop keys whose hits have all expired so the map cannot grow without bound.
    if (++calls % SWEEP_EVERY === 0) {
      for (const [k, times] of hits) {
        if (times.every((t) => now - t >= windowMs)) hits.delete(k)
      }
    }
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
