import type { Patch, SanityClient } from "@sanity/client"

import { isRevisionConflict } from "./sanity"

// Global cap on note writes (add, edit, delete, restore) across all isolates. The demo login is
// published and the per-IP limiter is per isolate, so Sanity holds the shared count. Notes live
// inside seasons and have no _createdAt to count, so each write also records its time in one
// counter document, in the same transaction and under ifRevisionID, so concurrent writes cannot
// overshoot the cap.
export const NOTE_WRITES_PER_HOUR = 60
export const NOTE_COUNTER_ID = "rate-note-writes"
export const STALE = "The season changed since you loaded it; reload and try again"

// Commits `patch` with the counter update. Returns the new revision, or null when the hourly cap is
// reached. A write to another season can move the counter between the read and the commit, so a
// 409 is retried a few times; a stale season revision still fails every attempt and surfaces as
// the 409 (isRevisionConflict).
export async function commitCountedNoteWrite(
  client: SanityClient,
  patch: Patch,
): Promise<string | null> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await commitOnce(client, patch)
    } catch (e) {
      if (attempt >= 3 || !isRevisionConflict(e)) throw e
    }
  }
}

async function commitOnce(client: SanityClient, patch: Patch): Promise<string | null> {
  const since = Date.now() - 3_600_000
  const counter = await client.fetch<{ _rev: string; writes: string[] | null } | null>(
    `*[_id == $id][0]{ _rev, writes }`,
    { id: NOTE_COUNTER_ID },
  )
  const recent = (counter?.writes ?? []).filter((t) => Date.parse(t) > since)
  if (recent.length >= NOTE_WRITES_PER_HOUR) return null
  const writes = [...recent, new Date().toISOString()]

  const tx = client.transaction().patch(patch)
  const result = await (
    counter
      ? tx.patch(client.patch(NOTE_COUNTER_ID).ifRevisionId(counter._rev).set({ writes }))
      : tx.create({ _id: NOTE_COUNTER_ID, _type: "writeCounter", writes })
  ).commit()
  return result.transactionId
}
