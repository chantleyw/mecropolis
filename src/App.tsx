import { useEffect, useState, type FormEvent } from "react"

import { api } from "./lib/api"
import { useLiveQuery } from "./lib/sanity/useLiveQuery"

// Milestone 1 gate page: proves public live reads from Sanity and a session-gated write through
// a Pages Function on the deployed Cloudflare origin. Replaced by the router in Milestone 3.

type FieldRow = { _id: string; name: string | null; farm: string | null }
type ObservationRow = { _id: string; date: string; notes: string; field: string | null }

const FIELDS_QUERY = `*[_type == "field"] | order(farm->name asc, name asc){ _id, name, "farm": farm->name }`
const OBS_QUERY = `*[_type == "observation"] | order(date desc)[0...10]{ _id, date, notes, "field": field->name }`

function useSession() {
  const [user, setUser] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    api<{ user: string | null }>("/api/session/me").then(
      (r) => setUser(r.user),
      () => setUser(null),
    )
  }, [])
  return [user, setUser] as const
}

function LoginForm({ onLogin }: { onLogin: (user: string) => void }) {
  const [error, setError] = useState<string | null>(null)
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    try {
      const r = await api<{ user: string }>("/api/session/login", {
        method: "POST",
        body: { user: form.get("user"), password: form.get("password") },
      })
      setError(null)
      onLogin(r.user)
    } catch (err) {
      setError((err as Error).message)
    }
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input name="user" placeholder="Username" className="input" autoComplete="username" required />
      <input name="password" type="password" placeholder="Password" className="input" autoComplete="current-password" required />
      <button className="btn btn-primary">Sign in</button>
      {error && <p className="w-full text-sm text-[var(--heat)]">{error}</p>}
    </form>
  )
}

function ObservationForm({ fields }: { fields: FieldRow[] }) {
  const [status, setStatus] = useState<string | null>(null)
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    const form = new FormData(formEl)
    try {
      await api("/api/observations", {
        method: "POST",
        body: { fieldId: form.get("fieldId"), notes: form.get("notes") },
      })
      formEl.reset()
      setStatus("Saved")
    } catch (err) {
      setStatus((err as Error).message)
    }
  }
  return (
    <form onSubmit={submit} className="card flex flex-col gap-2 p-4">
      <select name="fieldId" className="input" required>
        {fields.map((f) => (
          <option key={f._id} value={f._id}>
            {f.farm} / {f.name}
          </option>
        ))}
      </select>
      <textarea name="notes" className="input" placeholder="What did you see in the field?" required maxLength={2000} />
      <button className="btn btn-primary">Log observation</button>
      {status && <p className="text-sm text-[var(--muted)]">{status}</p>}
    </form>
  )
}

export function App() {
  const [user, setUser] = useSession()
  const fields = useLiveQuery<FieldRow[]>(FIELDS_QUERY, `*[_type == "field"]`)
  const observations = useLiveQuery<ObservationRow[]>(OBS_QUERY, `*[_type == "observation"]`)

  async function logout() {
    await api("/api/session/logout", { method: "POST" })
    setUser(null)
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-3">
        <p className="eyebrow">Mecropolis</p>
        <h1 className="text-gradient text-4xl font-semibold">Pages + Sanity check</h1>
        {user === undefined ? null : user ? (
          <p className="flex items-center gap-3 text-sm">
            Signed in as <strong>{user}</strong>
            <button className="btn" onClick={logout}>
              Sign out
            </button>
          </p>
        ) : (
          <LoginForm onLogin={setUser} />
        )}
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">
          Fields{" "}
          {fields.status === "ready" && (
            <span className="text-xs text-[var(--muted)]">{fields.live ? "live" : "connecting"}</span>
          )}
        </h2>
        {fields.status === "loading" && <p>Loading…</p>}
        {fields.status === "error" && <p className="text-[var(--heat)]">{fields.error.message}</p>}
        {fields.status === "ready" && <p className="text-sm">{fields.data.length} fields in Sanity</p>}
        {user && fields.status === "ready" && fields.data.length > 0 && <ObservationForm fields={fields.data} />}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Latest observations</h2>
        {observations.status === "error" && <p className="text-[var(--heat)]">{observations.error.message}</p>}
        {observations.status === "ready" && (
          <ul className="flex flex-col gap-2" data-testid="observations">
            {observations.data.map((o) => (
              <li key={o._id} className="card p-3 text-sm">
                <span className="text-[var(--muted)]">
                  {new Date(o.date).toLocaleString()} · {o.field}
                </span>
                <p>{o.notes}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
