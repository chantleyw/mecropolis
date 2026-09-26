import { useState, type FormEvent } from "react"
import { Link } from "react-router"

import { api } from "@/lib/api"

type Hit = {
  _id: string
  _type: "observation" | "treatment"
  date: string | null
  text: string | null
  product: string | null
  seasonId: string | null
  seasonLabel: string | null
  fieldName: string | null
}

const KIND = { observation: "Observation", treatment: "Treatment" } as const

// Treatment dates are date-only (UTC midnight), so show the calendar date for both kinds.
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-ZA", { dateStyle: "medium", timeZone: "UTC" })

// Semantic search over this farm's observation and treatment notes with Sanity Dataset Embeddings:
// results are ranked by meaning, not keyword match, so "insect damage" can find "aphids". Each
// search counts against a small shared daily cap, so it runs on submit only.
export function RecordSearch({ farmSlug }: { farmSlug: string }) {
  const [q, setQ] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hits, setHits] = useState<Hit[] | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const query = q.trim()
    if (query.length < 3) return setError("Type at least 3 characters")
    setBusy(true)
    setError(null)
    try {
      const params = new URLSearchParams({ q: query, farm: farmSlug })
      const { hits } = await api<{ hits: Hit[] }>(`/api/search?${params}`)
      setHits(hits)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="flex flex-wrap gap-3" role="search" noValidate>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search observations and treatments</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={200}
            placeholder="e.g. insect damage on young plants"
            className="input"
          />
        </label>
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? "Searching..." : "Search"}
        </button>
      </form>
      {error && (
        <p role="alert" className="text-warn text-sm">
          {error}
        </p>
      )}
      {hits && hits.length === 0 && (
        <p className="text-muted text-sm">No observations or treatments on this farm yet.</p>
      )}
      {hits && hits.length > 0 && (
        <ol className="divide-line border-line divide-y border-y text-sm">
          {hits.map((h) => (
            <li key={h._id} className="space-y-1 py-2.5">
              <div className="text-muted flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-ink font-medium">{KIND[h._type]}</span>
                {h.fieldName && <span>{h.fieldName}</span>}
                {h.date && (
                  <time dateTime={h.date} className="font-mono tabular-nums">
                    {formatDate(h.date)}
                  </time>
                )}
                {h.seasonId && (
                  <Link
                    to={`/seasons/${encodeURIComponent(h.seasonId)}`}
                    className="ml-auto underline"
                  >
                    {h.seasonLabel ?? "Open season"}
                  </Link>
                )}
              </div>
              <p>
                {h.product && <span className="font-medium">{h.product}. </span>}
                {h.text ?? (h.product ? "" : "(no notes)")}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
