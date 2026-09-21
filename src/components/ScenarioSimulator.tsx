"use client"

import { useState } from "react"

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

const STATE_LABEL: Record<string, string> = {
  "before-emergence": "Before emergence",
  emerged: "Emerged",
  "thermal-maturity": "Thermal maturity reached",
}
const fmt = (n: number) => Math.round(n).toLocaleString("en-US")

function Column({ title, s }: { title: string; s: Side }) {
  return (
    <div className="border-line bg-surface-2 rounded-xl border p-4 text-sm">
      <p className="eyebrow">{title}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{fmt(s.gdd)} GDD</p>
      <p className="text-muted mt-1">{STATE_LABEL[s.state] ?? s.state}</p>
      <p className="text-muted mt-1 text-xs">
        {s.window.start} to {s.window.end}. Emergence {s.emergenceDate ?? "not reached"}; maturity{" "}
        {s.maturityDate ?? "not reached"}. {Math.round(s.coverage * 100)}% of days have data.
      </p>
    </div>
  )
}

export function ScenarioSimulator({ seasonId }: { seasonId: string }) {
  const [shift, setShift] = useState(0)
  const [adjust, setAdjust] = useState(0)
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
        body: JSON.stringify({ seasonId, plantingShiftDays: shift, tempAdjustC: adjust }),
      })
      const data: Partial<Result> & { error?: string; reason?: string } = await res
        .json()
        .catch(() => ({}))
      if (!res.ok || !data.observed || !data.scenario) {
        setResult(null)
        setError(`${data.error ?? "Request failed"}${data.reason ? `: ${data.reason}` : ""}`)
      } else {
        setResult({ observed: data.observed, scenario: data.scenario })
      }
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={run} className="flex flex-wrap items-end gap-4 text-sm">
        <label className="space-y-1">
          <span className="eyebrow block">Planting shift (days)</span>
          <input
            type="number"
            min={-30}
            max={30}
            step={1}
            value={shift}
            onChange={(e) => setShift(Number(e.target.value))}
            className="border-line bg-surface-2 w-32 rounded-lg border px-3 py-2"
          />
        </label>
        <label className="space-y-1">
          <span className="eyebrow block">Temperature change (°C)</span>
          <input
            type="number"
            min={-5}
            max={5}
            step={0.5}
            value={adjust}
            onChange={(e) => setAdjust(Number(e.target.value))}
            className="border-line bg-surface-2 w-32 rounded-lg border px-3 py-2"
          />
        </label>
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? "Working..." : "Run scenario"}
        </button>
      </form>
      {error && (
        <p role="alert" className="bg-warn-soft text-warn rounded-lg p-3 text-sm">
          {error}
        </p>
      )}
      {result && (
        <div className="grid gap-3 md:grid-cols-2">
          <Column title="Observed" s={result.observed} />
          <Column title="Scenario" s={result.scenario} />
        </div>
      )}
      <p className="text-muted text-xs">
        Scenario calculation, not observed field data. Uses the hand-authored crop model over
        observed weather to date; nothing is saved.
      </p>
    </div>
  )
}
