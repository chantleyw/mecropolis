import { useState } from "react"

import { dateLocale, useI18n } from "@/lib/i18n/store"

interface Side {
  window: { start: string; end: string }
  gdd: number
  coverage: number
  emergenceDate: string | null
  maturityDate: string | null
  state: string
}
interface Result {
  observed: Side
  scenario: Side
}

const STATE_KEY = {
  "before-emergence": "season.scenario.state.before-emergence",
  emerged: "season.scenario.state.emerged",
  "thermal-maturity": "season.scenario.state.thermal-maturity",
} as const
const fmt = (n: number) => Math.round(n).toLocaleString(dateLocale("en-US"))

function Column({ title, s }: { title: string; s: Side }) {
  const { t } = useI18n()
  const stateKey = STATE_KEY[s.state as keyof typeof STATE_KEY]
  return (
    <div className="border-line border-t pt-4 text-sm">
      <p className="eyebrow">{title}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {t("season.scenario.gdd", { value: fmt(s.gdd) })}
      </p>
      <p className="text-muted mt-1">{stateKey ? t(stateKey) : s.state}</p>
      <p className="text-muted mt-1 text-xs">
        {t("season.scenario.window", {
          start: s.window.start,
          end: s.window.end,
          emergence: s.emergenceDate ?? t("season.scenario.notReached"),
          maturity: s.maturityDate ?? t("season.scenario.notReached"),
          coverage: Math.round(s.coverage * 100),
        })}
      </p>
    </div>
  )
}

export function ScenarioSimulator({ seasonId }: { seasonId: string }) {
  const { t } = useI18n()
  // Kept as strings: Number("-") is 0, which reset the field when typing a negative value. The
  // inputs are required, so the browser blocks submitting an empty or partial number.
  const [shift, setShift] = useState("0")
  const [adjust, setAdjust] = useState("0")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  async function run(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/scenario", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          seasonId,
          plantingShiftDays: Number(shift),
          tempAdjustC: Number(adjust),
        }),
      })
      const data: Partial<Result> & { error?: string; reason?: string } = await res
        .json()
        .catch(() => ({}))
      if (!res.ok || !data.observed || !data.scenario) {
        setResult(null)
        setError(
          `${data.error ?? t("common.requestFailed")}${data.reason ? `: ${data.reason}` : ""}`,
        )
      } else {
        setResult({ observed: data.observed, scenario: data.scenario })
      }
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : t("common.requestFailed"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={run} className="flex flex-wrap items-end gap-4 text-sm">
        <label className="space-y-1">
          <span className="eyebrow block">{t("season.scenario.shift")}</span>
          <input
            type="number"
            min={-30}
            max={30}
            step={1}
            required
            value={shift}
            onChange={(e) => setShift(e.target.value)}
            className="border-line bg-surface-2 w-32 rounded-lg border px-3 py-2"
          />
        </label>
        <label className="space-y-1">
          <span className="eyebrow block">{t("season.scenario.temp")}</span>
          <input
            type="number"
            min={-5}
            max={5}
            step={0.5}
            required
            value={adjust}
            onChange={(e) => setAdjust(e.target.value)}
            className="border-line bg-surface-2 w-32 rounded-lg border px-3 py-2"
          />
        </label>
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? t("common.working") : t("season.scenario.run")}
        </button>
      </form>
      {error && (
        <p role="alert" className="bg-warn-soft text-warn rounded-lg p-3 text-sm">
          {error}
        </p>
      )}
      {result && (
        <div className="grid gap-3 md:grid-cols-2">
          <Column title={t("season.scenario.observed")} s={result.observed} />
          <Column title={t("season.scenario.scenario")} s={result.scenario} />
        </div>
      )}
      <p className="text-muted text-xs">{t("season.scenario.note")}</p>
    </div>
  )
}
