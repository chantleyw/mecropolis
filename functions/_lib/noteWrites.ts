import type { Patch, SanityClient } from "@sanity/client"

// Global cap on note writes (add, edit, delete, restore) across all isolates. The demo login is
// published and the per-IP limiter is per isolate, so Sanity holds the shared count. Notes live
// inside seasons and have no _createdAt to count, so each write also records its time in one
// counter document, in the same transaction and under ifRevisionID, so concurrent writes cannot
// overshoot the cap.
export const NOTE_WRITES_PER_HOUR = 60
export const NOTE_COUNTER_ID = "rate-note-writes"

// Commits `patch` with the counter update. Returns the new revision, or null when the hourly cap is
// reached. A concurrent write surfaces as a 409 from Sanity (isRevisionConflict).
export async function commitCountedNoteWrite(
  client: SanityClient,
  patch: Patch,
): Promise<string | null> {
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
