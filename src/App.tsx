import { AuthStateType } from "@sanity/sdk"
import { AuthBoundary, SanityApp, useAuthState, useLoginUrl, useLogOut } from "@sanity/sdk-react"

import { publicEnv } from "./lib/publicEnv"

// AuthBoundary handles the OAuth callback itself (no separate /auth/callback route exists in
// @sanity/sdk-react@3.3.0); this only overrides the signed-out screen it renders meanwhile.
function SignInScreen() {
  const loginUrl = useLoginUrl()
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="eyebrow">Mecropolis</p>
      <h1 className="text-gradient text-3xl font-semibold">Sign in with Sanity</h1>
      <p className="text-[var(--muted)]">Operators authenticate with their own Sanity account.</p>
      <a className="card card-lift px-6 py-3 font-medium" href={loginUrl}>
        Continue to sanity.io
      </a>
    </main>
  )
}

function SignedInBar() {
  const authState = useAuthState()
  const logOut = useLogOut()

  if (authState.type !== AuthStateType.LOGGED_IN) return null

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 text-sm text-[var(--muted)]">
      <span>{authState.currentUser?.email ?? "Signed in"}</span>
      <button type="button" className="card card-lift px-3 py-1" onClick={() => void logOut()}>
        Sign out
      </button>
    </div>
  )
}

export function App() {
  return (
    <SanityApp
      config={[{ projectId: publicEnv.projectId, dataset: publicEnv.dataset }]}
      fallback={<p className="p-4 text-center text-[var(--muted)]">Loading…</p>}
    >
      <AuthBoundary LoginComponent={SignInScreen}>
        <SignedInBar />
        <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="eyebrow">Mecropolis</p>
          <h1 className="text-gradient text-4xl font-semibold">Signed in</h1>
          <p className="text-[var(--muted)]">Milestone 1: Sanity auth gate is live.</p>
          <div className="card card-lift orb float h-16 w-16" />
        </main>
      </AuthBoundary>
    </SanityApp>
  )
}
