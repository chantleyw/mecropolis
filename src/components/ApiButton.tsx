"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

interface Props {
  label: string
  url: string
  body: Record<string, string>
}

// POSTs to an API route, then refreshes server data. Failures are shown, not hidden.
export function ApiButton({ label, url, body }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

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
        setMessage(`${data.error ?? "Request failed"}${data.reason ? `: ${data.reason}` : ""}`)
      } else {
        setMessage(data.blockedBy ? `Blocked: ${data.blockedBy}` : "Done")
        router.refresh()
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Request failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="rounded border border-current px-3 py-1 text-sm disabled:opacity-50"
      >
        {busy ? "Working..." : label}
      </button>
      {message && (
        <span role="status" className="text-sm">
          {message}
        </span>
      )}
    </div>
  )
}
