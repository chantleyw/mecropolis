import { useState, type FormEvent, type ReactNode } from "react"

import { api } from "@/lib/api"
import {
  observationSchema,
  TREATMENT_METHODS,
  TREATMENT_TYPES,
  treatmentSchema,
} from "@/lib/fieldLog"
import { useI18n } from "@/lib/i18n/store"
import type { SeasonDetail } from "@/lib/sanity/queries"

const control = "border-line bg-surface w-full rounded-md border px-3 py-2 text-sm"

const firstIssue = (error: { issues: { message: string }[] }, fallback: string) =>
  error.issues[0]?.message ?? fallback

// Local calendar day, so the default matches the operator's clock, not UTC.
function today(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Validates with the shared schema, POSTs, and reports the outcome. The live listener shows the
// new document; this only resets the form on success.
function useSubmit() {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

  async function submit(path: string, body: unknown, onDone: () => void) {
    setBusy(true)
    setMessage(null)
    try {
      await api(path, { method: "POST", body })
      setMessage({ text: t("season.saved"), error: false })
      onDone()
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : t("common.requestFailed"), error: true })
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
  const { t } = useI18n()
  const [notes, setNotes] = useState("")
  const { busy, message, submit, invalid } = useSubmit()

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const parsed = observationSchema.safeParse({ fieldId, notes })
    if (!parsed.success) return invalid(firstIssue(parsed.error, t("season.log.invalidInput")))
    void submit("/api/observations", parsed.data, () => setNotes(""))
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <Label text={t("season.log.observation")}>
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
          {busy ? t("season.saving") : t("season.log.logObservation")}
        </button>
        <Status message={message} />
      </div>
    </form>
  )
}

function TreatmentForm({ seasonId }: { seasonId: string }) {
  const { t } = useI18n()
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
    if (!parsed.success) return invalid(firstIssue(parsed.error, t("season.log.invalidInput")))
    void submit("/api/treatments", parsed.data, () => setForm(empty))
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <Label text={t("season.log.date")}>
          <input
            type="date"
            value={form.date}
            max={today()}
            onChange={set("date")}
            required
            className={control}
          />
        </Label>
        <Label text={t("season.log.type")}>
          <select value={form.type} onChange={set("type")} className={control}>
            {TREATMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`season.log.type.${type}` as const)}
              </option>
            ))}
          </select>
        </Label>
        <Label text={t("season.log.product")}>
          <input
            value={form.product}
            onChange={set("product")}
            maxLength={200}
            required
            className={control}
          />
        </Label>
        <Label text={t("season.log.dosage")}>
          <input
            value={form.dosage}
            onChange={set("dosage")}
            maxLength={100}
            placeholder={t("season.log.dosagePlaceholder")}
            className={control}
          />
        </Label>
        <Label text={t("season.log.method")}>
          <select value={form.method} onChange={set("method")} className={control}>
            <option value="">{t("season.log.methodNone")}</option>
            {TREATMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {t(`season.log.method.${m}` as const)}
              </option>
            ))}
          </select>
        </Label>
        <Label text={t("season.log.notes")}>
          <input value={form.notes} onChange={set("notes")} maxLength={2000} className={control} />
        </Label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? t("season.saving") : t("season.log.logTreatment")}
        </button>
        <Status message={message} />
      </div>
    </form>
  )
}

const day = (iso: string | null, none: string) => (iso ? iso.slice(0, 10) : none)

// Operator-entered observations and treatments for one season, newest first.
export function FieldLog({ season }: { season: SeasonDetail }) {
  const { t } = useI18n()
  const treatmentTypes: readonly string[] = TREATMENT_TYPES
  const noDate = t("season.log.noDate")
  const entries = [
    ...season.observations.map((o) => ({
      key: o._id,
      date: day(o.date, noDate),
      title: t("season.log.observation"),
      detail: o.notes ?? "",
    })),
    ...season.treatments.map((tr) => ({
      key: tr._id,
      date: day(tr.date, noDate),
      title: t("season.log.treatmentTitle", {
        type:
          tr.type && treatmentTypes.includes(tr.type)
            ? t(`season.log.type.${tr.type}` as const)
            : (tr.type ?? t("season.log.treatment")),
        product: tr.product ?? t("season.log.productMissing"),
      }),
      detail: [
        tr.dosage,
        tr.method,
        tr.applicator ? t("season.log.by", { name: tr.applicator }) : null,
        tr.notes,
      ]
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
          <p className="text-muted text-sm">{t("season.log.noField")}</p>
        )}
        <TreatmentForm seasonId={season._id} />
      </div>
      {entries.length === 0 ? (
        <p className="text-muted text-sm">{t("season.log.empty")}</p>
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
