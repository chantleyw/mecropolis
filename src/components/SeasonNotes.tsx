import { PortableText, type PortableTextComponents } from "@portabletext/react"
import { useState } from "react"

import { api } from "@/lib/api"
import {
  blocksToText,
  formatNoteTime,
  NOTES_MAX_CHARS,
  NOTES_MAX_COUNT,
  notesSchema,
  type NoteAction,
} from "@/lib/notes"
import type { SeasonDetail } from "@/lib/sanity/queries"

const components: PortableTextComponents = {
  block: { normal: ({ children }) => <p className="leading-relaxed">{children}</p> },
  list: { bullet: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul> },
  marks: { strong: ({ children }) => <strong className="font-semibold">{children}</strong> },
}

type Note = NonNullable<SeasonDetail["notes"]>[number]
// What the editor is open for: a new note, or the key of the note being edited.
type Editing = { key: string | null; text: string }

// A season's notes, newest first. Each note is dated and signed and is edited or deleted on its
// own, so a change (or a restore from the revision history) touches one note. Editing is plain
// text (paragraphs, "- " bullets, **bold**); the Function converts it to Portable Text.
export function SeasonNotes({
  seasonId,
  rev,
  notes,
}: {
  seasonId: string
  rev: string
  notes: SeasonDetail["notes"]
}) {
  const [editing, setEditing] = useState<Editing | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const list = notes ?? []

  async function send(request: NoteAction) {
    const parsed = notesSchema.safeParse({ ...request, seasonId, rev })
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid note")
    setBusy(true)
    setError(null)
    try {
      await api("/api/notes", { method: "POST", body: parsed.data })
      setEditing(null)
      setConfirmDelete(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setBusy(false)
    }
  }

  function save() {
    if (!editing) return
    return send(
      editing.key === null
        ? { action: "add", text: editing.text }
        : { action: "edit", key: editing.key, text: editing.text },
    )
  }

  const errorLine = error && (
    <p role="alert" className="text-warn text-sm">
      {error}
    </p>
  )

  const editor = editing && (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="eyebrow block">{editing.key === null ? "New note" : "Edit note"}</span>
        <textarea
          value={editing.text}
          onChange={(e) => setEditing({ ...editing, text: e.target.value })}
          maxLength={NOTES_MAX_CHARS}
          rows={6}
          className="input"
        />
      </label>
      <p className="text-muted text-sm">
        Blank line between paragraphs. Start a line with "- " for a bullet; wrap text in ** for
        bold.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>
          {busy ? "Saving..." : "Save note"}
        </button>
        <button type="button" className="btn" disabled={busy} onClick={() => setEditing(null)}>
          Cancel
        </button>
      </div>
      {errorLine}
    </div>
  )

  return (
    <div className="space-y-4">
      {editing?.key === null
        ? editor
        : list.length < NOTES_MAX_COUNT && (
            <button
              type="button"
              className="btn"
              disabled={editing !== null}
              onClick={() => {
                setError(null)
                setEditing({ key: null, text: "" })
              }}
            >
              {list.length === 0 ? "Add a note" : "Add another note"}
            </button>
          )}

      {list.length === 0 ? (
        <p className="text-muted text-sm">No notes for this season yet.</p>
      ) : (
        <ol className="divide-line border-line divide-y border-y">
          {list.map((note) => (
            <li key={note._key} className="space-y-3 py-3">
              {editing?.key === note._key ? (
                editor
              ) : (
                <NoteView
                  note={note}
                  locked={editing !== null || busy}
                  confirming={confirmDelete === note._key}
                  onEdit={() => {
                    setError(null)
                    setConfirmDelete(null)
                    setEditing({ key: note._key, text: blocksToText(note.body ?? []) })
                  }}
                  onDelete={() => {
                    setError(null)
                    setConfirmDelete(note._key)
                  }}
                  onConfirm={() => send({ action: "delete", key: note._key })}
                  onCancel={() => setConfirmDelete(null)}
                />
              )}
              {confirmDelete === note._key && errorLine}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function NoteView({
  note,
  locked,
  confirming,
  onEdit,
  onDelete,
  onConfirm,
  onCancel,
}: {
  note: Note
  locked: boolean
  confirming: boolean
  onEdit: () => void
  onDelete: () => void
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <>
      <p className="text-muted flex flex-wrap gap-x-3 text-sm">
        {note.createdAt && (
          <time dateTime={note.createdAt} className="font-mono tabular-nums">
            {formatNoteTime(note.createdAt)}
          </time>
        )}
        {note.author && <span>{note.author}</span>}
        {note.updatedAt && <span>edited {formatNoteTime(note.updatedAt)}</span>}
      </p>
      <div className="max-w-prose space-y-3">
        <PortableText value={note.body ?? []} components={components} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {confirming ? (
          <>
            <span className="text-sm">
              Delete this note? Recent deletions can be restored from the revision history.
            </span>
            <button type="button" className="btn btn-primary" disabled={locked} onClick={onConfirm}>
              Delete note
            </button>
            <button type="button" className="btn" disabled={locked} onClick={onCancel}>
              Keep it
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn" disabled={locked} onClick={onEdit}>
              Edit
            </button>
            <button type="button" className="btn" disabled={locked} onClick={onDelete}>
              Delete
            </button>
          </>
        )}
      </div>
    </>
  )
}
