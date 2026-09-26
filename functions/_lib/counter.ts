import type { SanityClient } from "@sanity/client"

import { isRevisionConflict } from "./sanity"

// Global caps on metered calls (embeddings queries, Agent Actions). The per-IP limiter is per
// isolate and the demo login is published, so Sanity holds the shared count: one counter document
// with the times of recent calls, updated under ifRevisionID so concurrent calls cannot overshoot.
// Returns false when any `limit` is already reached by the calls inside its `windowMs`. A 409 means
// another call moved the counter first; retry a few times.
export async function reserveCall(
  client: SanityClient,
  id: string,
  limits: { limit: number; windowMs: number }[],
): Promise<boolean> {
  const keepMs = Math.max(...limits.map((l) => l.windowMs))
  for (let attempt = 1; ; attempt++) {
    try {
      const now = Date.now()
      const counter = await client.fetch<{ _rev: string; writes: string[] | null } | null>(
        `*[_id == $id][0]{ _rev, writes }`,
        { id },
      )
      const recent = (counter?.writes ?? []).filter((t) => Date.parse(t) > now - keepMs)
      const within = (ms: number) => recent.filter((t) => Date.parse(t) > now - ms).length
      if (limits.some((l) => within(l.windowMs) >= l.limit)) return false
      const writes = [...recent, new Date().toISOString()]
      await (counter
        ? client.patch(id).ifRevisionId(counter._rev).set({ writes }).commit()
        : client.create({ _id: id, _type: "writeCounter", writes }))
      return true
    } catch (e) {
      if (attempt >= 3 || !isRevisionConflict(e)) throw e
    }
  }
}
