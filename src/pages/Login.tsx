import { useState, type FormEvent } from "react"
import { Navigate, useNavigate, useSearchParams } from "react-router"

import { useSession } from "@/lib/session"
import { useTitle } from "@/lib/useTitle"

// Only same-site paths, so ?next= cannot send the visitor to another origin.
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard"
}

export function Login() {
  useTitle("Sign in")
  const { user, login } = useSession()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const target = safeNext(params.get("next"))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={target} replace />

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setBusy(true)
    setError(null)
    try {
      await login(String(form.get("username") ?? ""), String(form.get("password") ?? ""))
      void navigate(target, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-[calc(100vh-3.5rem)] place-items-center px-4">
      <div className="card w-full max-w-sm p-7">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-muted mt-1 text-sm">Field and crop tracker</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Username
            <input name="username" autoComplete="username" required className="input mt-1.5" />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="input mt-1.5"
            />
          </label>
          {error && (
            <p role="alert" className="bg-warn-soft text-warn rounded-lg p-3 text-sm">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className="btn btn-primary w-full justify-center">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  )
}
