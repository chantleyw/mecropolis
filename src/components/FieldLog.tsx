import { useState, type FormEvent, type ReactNode } from "react"

import { api } from "@/lib/api"
import {
  observationSchema,
  TREATMENT_METHODS,
  TREATMENT_TYPES,
  treatmentSchema,
} from "@/lib/fieldLog"
import type { SeasonDetail } from "@/lib/sanity/queries"

const control = "border-line bg-surface w-full rounded-md border px-3 py-2 text-sm"

const firstIssue = (error: { issues: { message: string }[] }) =>
  error.issues[0]?.message ?? "Invalid input"

// Local calendar day, so the default matches the operator's clock, not UTC.
function today(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Validates with the shared schema, POSTs, and reports the outcome. The live listener shows the
// new document; this only resets the form on success.
function useSubmit() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

  async function submit(path: string, body: unknown, onDone: () => void) {
    setBusy(true)
    setMessage(null)
    try {
      await api(path, { method: "POST", body })
      setMessage({ text: "Saved", error: false })
      onDone()
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : "Request failed", error: true })
    } finally {
      setBusy(false)
    }
  }
  const invalid = (text: string) => setMessage({ text, error: true })
  return { busy, message, submit, invalid }
}

function Label({ text, children }: { text: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="eyebrow block">{text}</span>
      {children}
    </label>
  )
}

function Status({ message }: { message: { text: string; error: boolean } | null }) {
  if (!message) return null
  return (
    <span
      role={message.error ? "alert" : "status"}
      className={`text-sm ${message.error ? "text-warn" : "text-muted"}`}
    >
      {message.text}
    </span>
  )
}

function ObservationForm({ fieldId }: { fieldId: string }) {
  const [notes, setNotes] = useState("")
  const { busy, message, submit, invalid } = useSubmit()

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const parsed = observationSchema.safeParse({ fieldId, notes })
    if (!parsed.success) return invalid(firstIssue(parsed.error))
    void submit("/api/observations", parsed.data, () => setNotes(""))
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <Label text="Observation">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
          rows={3}
          required
          className={control}
        />
      </Label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? "Saving..." : "Log observation"}
        </button>
        <Status message={message} />
      </div>
    </form>
  )
}

function TreatmentForm({ seasonId }: { seasonId: string }) {
  const empty = {
    date: today(),
    type: "fertiliser",
    product: "",
    dosage: "",
    method: "",
    notes: "",
  }
  const [form, setForm] = useState(empty)
  const { busy, message, submit, invalid } = useSubmit()
  const set = (key: keyof typeof empty) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const parsed = treatmentSchema.safeParse({
      seasonId,
      ...form,
      method: form.method || undefined,
    })
    if (!parsed.success) return invalid(firstIssue(parsed.error))
    void submit("/api/treatments", parsed.data, () => setForm(empty))
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <Label text="Date">
          <input
            type="date"
            value={form.date}
            max={today()}
            onChange={set("date")}
            required
            className={control}
          />
        </Label>
        <Label text="Type">
          <select value={form.type} onChange={set("type")} className={control}>
            {TREATMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Label>
        <Label text="Product">
          <input
            value={form.product}
            onChange={set("product")}
            maxLength={200}
            required
            className={control}
          />
        </Label>
        <Label text="Dosage (optional)">
          <input
            value={form.dosage}
            onChange={set("dosage")}
            maxLength={100}
            placeholder="200 kg/ha"
            className={control}
          />
        </Label>
        <Label text="Method (optional)">
          <select value={form.method} onChange={set("method")} className={control}>
            <option value="">Not recorded</option>
            {TREATMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Label>
        <Label text="Notes (optional)">
          <input value={form.notes} onChange={set("notes")} maxLength={2000} className={control} />
        </Label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? "Saving..." : "Log treatment"}
        </button>
        <Status message={message} />
      </div>
    </form>
  )
}

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "No date")

// Operator-entered observations and treatments for one season, newest first.
export function FieldLog({ season }: { season: SeasonDetail }) {
  const entries = [
    ...season.observations.map((o) => ({
      key: o._id,
      date: day(o.date),
      title: "Observation",
      detail: o.notes ?? "",
    })),
    ...season.treatments.map((t) => ({
      key: t._id,
      date: day(t.date),
      title: `${t.type ?? "Treatment"}: ${t.product ?? "product not recorded"}`,
      detail: [t.dosage, t.method, t.applicator ? `by ${t.applicator}` : null, t.notes]
        .filter(Boolean)
        .join(" · "),
    })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {season.fieldId ? (
          <ObservationForm fieldId={season.fieldId} />
        ) : (
          <p className="text-muted text-sm">
            This season has no field, so observations cannot be logged.
          </p>
        )}
        <TreatmentForm seasonId={season._id} />
      </div>
      {entries.length === 0 ? (
        <p className="text-muted text-sm">Nothing logged for this season yet.</p>
      ) : (
        <ul className="divide-line divide-y text-sm">
          {entries.map((e) => (
            <li key={e.key} className="py-2">
              <p className="font-medium">
                <span className="text-muted tabular-nums">{e.date}</span> {e.title}
              </p>
              {e.detail && <p className="text-muted whitespace-pre-line">{e.detail}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
