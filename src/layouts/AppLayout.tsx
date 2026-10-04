import { useState } from "react"
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router"

import { BackButton } from "@/components/BackButton"
import { Brand } from "@/components/Brand"
import { FarmSwitcher } from "@/components/FarmSwitcher"
import { Loading } from "@/components/States"
import { LanguagePicker } from "@/components/LanguagePicker"
import { ThemeToggle } from "@/components/ThemeToggle"
import { useI18n } from "@/lib/i18n/store"
import { loadFarms } from "@/lib/sanity/queries"
import { useLive } from "@/lib/sanity/useLive"
import { useSession } from "@/lib/session"

const NO_PARAMS = {}

// Sign-in gate for the app routes. It is a UX gate: the dataset is public-read; writes are
// enforced by the Functions.
export function AppLayout() {
  const { t } = useI18n()
  const { user } = useSession()
  const location = useLocation()

  if (user === undefined) return <Loading what={t("common.session")} />
  if (user === null) {
    const next = location.pathname + location.search
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }
  return <SignedIn user={user} />
}

function SignedIn({ user }: { user: string }) {
  const { t } = useI18n()
  const { logout } = useSession()
  const navigate = useNavigate()
  const farms = useLive(loadFarms, NO_PARAMS)
  const [signOutError, setSignOutError] = useState<string | null>(null)

  async function signOut() {
    setSignOutError(null)
    try {
      await logout()
    } catch (e) {
      setSignOutError(
        t("nav.signOutFailed", {
          error: e instanceof Error ? e.message : t("common.requestFailed"),
        }),
      )
      return
    }
    void navigate("/login")
  }

  return (
    <>
      <header className="border-line bg-surface sticky top-0 z-20 border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-6">
            <BackButton />
            <Brand compact />
            <Link to="/dashboard" className="text-muted hover:text-ink hidden text-sm sm:inline">
              {t("nav.dashboard")}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {farms.status === "ready" && <FarmSwitcher farms={farms.data} />}
            <LanguagePicker />
            <ThemeToggle />
            <span className="text-muted hidden text-sm sm:inline">{user}</span>
            <button type="button" className="btn whitespace-nowrap" onClick={() => void signOut()}>
              {t("nav.signOut")}
            </button>
          </div>
        </div>
        {signOutError && (
          <p role="alert" className="text-warn mx-auto max-w-6xl px-4 pb-2 text-sm sm:px-6">
            {signOutError}
          </p>
        )}
      </header>
      <Outlet />
    </>
  )
}
