import { PortableText, type PortableTextComponents } from "@portabletext/react"
import { useState } from "react"

import { api } from "@/lib/api"
import { blocksToText, NOTES_MAX_CHARS, notesSchema } from "@/lib/notes"
import type { SeasonDetail } from "@/lib/sanity/queries"

const components: PortableTextComponents = {
  block: { normal: ({ children }) => <p className="leading-relaxed">{children}</p> },
  list: { bullet: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul> },
  marks: { strong: ({ children }) => <strong className="font-semibold">{children}</strong> },
}

// Season notes stored as Portable Text, rendered with @portabletext/react. Editing is plain text
// (paragraphs, "- " bullets, **bold**); the Function converts it to blocks.
export function SeasonNotes({
  seasonId,
  rev,
  notes,
}: {
  seasonId: string
  rev: string
  notes: SeasonDetail["notes"]
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (draft === null) return
    const parsed = notesSchema.safeParse({ seasonId, rev, text: draft })
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid notes")
    setBusy(true)
    setError(null)
    try {
      await api("/api/notes", { method: "POST", body: parsed.data })
      setDraft(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setBusy(false)
    }
  }

  if (draft === null) {
    return (
      <div className="space-y-4">
        {notes && notes.length > 0 ? (
          <div className="max-w-prose space-y-3">
            <PortableText value={notes} components={components} />
          </div>
        ) : (
          <p className="text-muted text-sm">No notes for this season yet.</p>
        )}
        <button type="button" className="btn" onClick={() => setDraft(blocksToText(notes ?? []))}>
          Edit notes
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="eyebrow block">Notes</span>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={NOTES_MAX_CHARS}
          rows={8}
          className="input"
        />
      </label>
      <p className="text-muted text-sm">
        Blank line between paragraphs. Start a line with "- " for a bullet; wrap text in ** for
        bold.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>
          {busy ? "Saving..." : "Save notes"}
        </button>
        <button type="button" className="btn" disabled={busy} onClick={() => setDraft(null)}>
          Cancel
        </button>
        {error && (
          <span role="alert" className="text-warn text-sm">
            {error}
          </span>
        )}
      </div>
    </div>
  )
}
