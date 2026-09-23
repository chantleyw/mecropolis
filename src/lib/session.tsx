import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"

import { api } from "./api"

// user is undefined while /api/session/me is in flight and null when signed out.
type SessionValue = {
  user: string | null | undefined
  login: (user: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

// The session cookie is HttpOnly, so the SPA asks the Functions who is signed in. The app-route
// gate built on this is a UX gate only: the dataset is public-read and every write Function
// checks the cookie itself. A failed check reads as signed out, and the login form then shows
// the Function's error if it is still failing.
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    api<{ user: string | null }>("/api/session/me").then(
      (r) => setUser(r.user),
      () => setUser(null),
    )
  }, [])

  const login = useCallback(async (name: string, password: string) => {
    const r = await api<{ user: string }>("/api/session/login", {
      method: "POST",
      body: { user: name, password },
    })
    setUser(r.user)
  }, [])

  const logout = useCallback(async () => {
    await api("/api/session/logout", { method: "POST" })
    setUser(null)
  }, [])

  return (
    <SessionContext.Provider value={{ user, login, logout }}>{children}</SessionContext.Provider>
  )
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error("useSession outside SessionProvider")
  return value
}
