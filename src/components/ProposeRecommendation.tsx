import { useState, type FormEvent } from "react"
import { Link } from "react-router"

import { api } from "@/lib/api"
import { useI18n } from "@/lib/i18n/store"
import type { EvidenceRef } from "@/lib/evidence/types"
import { proposalSchema, toEvidenceItems } from "@/lib/recommendations/proposal"
import { RECOMMENDATION_TYPES, type RecommendationType } from "@/lib/recommendations/types"

const control = "border-line bg-surface w-full rounded-md border px-3 py-2 text-sm"

type Message = { text: string; error: boolean } | null

// Proposes a recommendation for this season. It is saved as a Sanity draft, which stays out of
// public reads until someone approves or rejects it in the farm's queue. The season's evidence
// (the references listed above, from its real GDD and weather numbers) can be attached.
export function ProposeRecommendation({
  seasonId,
  farmSlug,
  evidence,
}: {
  seasonId: string
  farmSlug: string | null
  evidence: EvidenceRef[]
}) {
  const { t } = useI18n()
  const [type, setType] = useState<RecommendationType>("monitor")
  const [rationale, setRationale] = useState("")
  const [attach, setAttach] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<Message>(null)
  const [proposed, setProposed] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const parsed = proposalSchema.safeParse({
      seasonId,
      type,
      rationale,
      evidence: attach ? toEvidenceItems(evidence) : [],
    })
    if (!parsed.success) {
      setMessage({
        text: parsed.error.issues[0]?.message ?? t("season.propose.invalid"),
        error: true,
      })
      return
    }
    setBusy(true)
    setMessage(null)
    setProposed(false)
    try {
      await api("/api/recommendations", { method: "POST", body: parsed.data })
      setRationale("")
      setProposed(true)
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : t("common.requestFailed"),
        error: true,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <label className="block space-y-1">
        <span className="eyebrow block">{t("season.propose.type")}</span>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as RecommendationType)}
          className={control}
        >
          {RECOMMENDATION_TYPES.map((rt) => (
            <option key={rt} value={rt}>
              {t(`season.propose.type.${rt}` as const)}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="eyebrow block">{t("season.propose.rationale")}</span>
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          maxLength={4000}
          rows={3}
          required
          className={control}
        />
      </label>
      {evidence.length > 0 && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} />
          {t("season.propose.attach", { count: evidence.length })}
        </label>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? t("season.saving") : t("season.propose.submit")}
        </button>
        {message && (
          <span role="alert" className="text-warn text-sm">
            {message.text}
          </span>
        )}
        {proposed && (
          <span role="status" className="text-muted text-sm">
            {t("season.propose.saved")}{" "}
            {farmSlug && (
              <Link to={`/dashboard/${encodeURIComponent(farmSlug)}`} className="underline">
                {t("season.propose.review")}
              </Link>
            )}
          </span>
        )}
      </div>
    </form>
  )
}
