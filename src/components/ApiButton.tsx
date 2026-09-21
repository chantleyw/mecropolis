"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

interface Props {
  label: string
  url: string
  body: Record<string, string>
  primary?: boolean
}

// POSTs to an API route, then refreshes server data. Failures are shown, not hidden.
export function ApiButton({ label, url, body, primary }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

  async function run() {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      const data: { error?: string; reason?: string; blockedBy?: string | null } = await res
        .json()
        .catch(() => ({}))
      if (!res.ok) {
        setMessage({
          text: `${data.error ?? "Request failed"}${data.reason ? `: ${data.reason}` : ""}`,
          error: true,
        })
      } else {
        setMessage({
          text: data.blockedBy ? `Blocked: ${data.blockedBy}` : "Up to date",
          error: false,
        })
        router.refresh()
      }
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : "Request failed", error: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className={primary ? "btn btn-primary" : "btn"}
      >
        {busy ? "Working..." : label}
      </button>
      {message && (
        <span role="status" className={`text-sm ${message.error ? "text-warn" : "text-muted"}`}>
          {message.text}
        </span>
      )}
    </div>
  )
}
