// One-off migration: seasons used to hold one Portable Text notes field; notes are now separate
// dated entries. Wraps each season's old blocks into a single note dated by the revision that last
// changed them (from the History API). Author is left empty: the old field did not record one.
// Dry run by default; pass --write to apply. Uses ifRevisionId, so a concurrent edit fails the run.
import { createClient } from "@sanity/client"

import { newNoteKey } from "../src/lib/notes"

const required = (name: string): string => {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

const API_VERSION = "2026-01-01"
const projectId = required("VITE_SANITY_PROJECT_ID")
const dataset = required("VITE_SANITY_DATASET")
const token = required("SANITY_API_WRITE_TOKEN")
const write = process.argv.includes("--write")

const client = createClient({ projectId, dataset, apiVersion: API_VERSION, token, useCdn: false })

async function history(path: string): Promise<string> {
  const res = await fetch(
    `https://${projectId}.api.sanity.io/v${API_VERSION}/data/history/${dataset}${path}`,
    { headers: { authorization: `Bearer ${token}` } },
  )
  if (!res.ok) throw new Error(`History API returned ${res.status} for ${path}`)
  return res.text()
}

// Timestamp of the newest revision whose notes differ from the revision before it.
async function lastNotesChange(id: string): Promise<string> {
  const txs = (await history(`/transactions/${id}?excludeContent=true&reverse=true&limit=50`))
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l) as { id: string; timestamp: string })
  const notesAt = async (rev: string) => {
    const { documents } = JSON.parse(await history(`/documents/${id}?revision=${rev}`)) as {
      documents: { notes?: unknown }[]
    }
    return JSON.stringify(documents[0]?.notes ?? null)
  }
  let newer = await notesAt(txs[0]?.id ?? "")
  for (let i = 0; i < txs.length; i++) {
    const older = txs[i + 1]
    if (!older) return txs[i]?.timestamp ?? ""
    const before = await notesAt(older.id)
    if (before !== newer) return txs[i]?.timestamp ?? ""
    newer = before
  }
  throw new Error(`No revisions found for ${id}`)
}

type Season = { _id: string; _rev: string; notes: { _type: string }[] }

const seasons = await client.fetch<Season[]>(
  `*[_type == "season" && count(notes[_type == "block"]) > 0]{ _id, _rev, notes }`,
)
process.stdout.write(`${seasons.length} season(s) with old-style notes\n`)

for (const season of seasons) {
  const blocks = season.notes.filter((n) => n._type === "block")
  const kept = season.notes.filter((n) => n._type === "seasonNote")
  const createdAt = await lastNotesChange(season._id)
  if (!createdAt) throw new Error(`Could not date the notes of ${season._id}`)
  const note = { _type: "seasonNote", _key: newNoteKey(), createdAt, body: blocks }
  process.stdout.write(`${season._id}: ${blocks.length} block(s) -> one note dated ${createdAt}\n`)
  if (write) {
    await client
      .patch(season._id)
      .ifRevisionId(season._rev)
      .set({ notes: [...kept, note] })
      .commit()
    process.stdout.write(`${season._id}: written\n`)
  }
}
if (!write) process.stdout.write("Dry run; pass --write to apply.\n")
