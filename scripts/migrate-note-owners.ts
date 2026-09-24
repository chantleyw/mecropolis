// One-off migration: notes are owned by the account that wrote them (`ownerId`). Notes written
// before that have no owner; they all came from the demo account, so each gets ownerId = DEMO_USER.
// Dry run by default; pass --write to apply. Uses ifRevisionId, so a concurrent edit fails the run.
import { createClient } from "@sanity/client"

const required = (name: string): string => {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

const owner = required("DEMO_USER")
const write = process.argv.includes("--write")
const client = createClient({
  projectId: required("VITE_SANITY_PROJECT_ID"),
  dataset: required("VITE_SANITY_DATASET"),
  apiVersion: "2026-01-01",
  token: required("SANITY_API_WRITE_TOKEN"),
  useCdn: false,
})

type Season = { _id: string; _rev: string; keys: string[] }

const seasons = await client.fetch<Season[]>(
  `*[_type == "season" && count(notes[_type == "seasonNote" && !defined(ownerId)]) > 0]{
    _id, _rev, "keys": notes[_type == "seasonNote" && !defined(ownerId)]._key
  }`,
)
process.stdout.write(`${seasons.length} season(s) with notes that have no owner\n`)

for (const season of seasons) {
  process.stdout.write(`${season._id}: ${season.keys.length} note(s) -> owner set\n`)
  if (write) {
    // Keys are generated alphanumeric, so they are safe inside the path expression.
    const fields = Object.fromEntries(
      season.keys.map((key) => [`notes[_key=="${key}"].ownerId`, owner]),
    )
    await client.patch(season._id).ifRevisionId(season._rev).set(fields).commit()
    process.stdout.write(`${season._id}: written\n`)
  }
}
if (!write) process.stdout.write("Dry run; pass --write to apply.\n")
