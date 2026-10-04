import { useState, type FormEvent } from "react"
import { Navigate, useNavigate, useSearchParams } from "react-router"

import { useI18n } from "@/lib/i18n/store"
import { useSession } from "@/lib/session"
import { useTitle } from "@/lib/useTitle"

// Only same-site paths, so ?next= cannot send the visitor to another origin. Browsers read "\"
// as "/" in URLs, so "/\evil.com" is rejected along with "//evil.com".
function safeNext(value: string | null): string {
  return value && /^\/(?![/\\])/.test(value) && !value.includes("\\") ? value : "/dashboard"
}

export function Login() {
  const { t } = useI18n()
  useTitle(t("nav.signIn"))
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
      setError(err instanceof Error ? err.message : t("public.login.failed"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-[calc(100vh-3.5rem)] place-items-center px-4">
      <div className="card w-full max-w-sm p-7">
        <h1 className="text-2xl font-semibold tracking-tight">{t("nav.signIn")}</h1>
        <p className="text-muted mt-1 text-sm">{t("public.login.subtitle")}</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            {t("public.login.username")}
            <input name="username" autoComplete="username" required className="input mt-1.5" />
          </label>
          <label className="block text-sm font-medium">
            {t("public.login.password")}
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
            {busy ? t("public.login.submitting") : t("nav.signIn")}
          </button>
        </form>
      </div>
    </main>
  )
}
