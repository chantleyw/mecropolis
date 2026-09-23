import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router"

import { BackButton } from "@/components/BackButton"
import { Brand } from "@/components/Brand"
import { FarmSwitcher } from "@/components/FarmSwitcher"
import { Loading } from "@/components/States"
import { ThemeToggle } from "@/components/ThemeToggle"
import { loadFarms } from "@/lib/sanity/queries"
import { useLive } from "@/lib/sanity/useLive"
import { useSession } from "@/lib/session"

const NO_PARAMS = {}

// Sign-in gate for the app routes. It is a UX gate: the dataset is public-read; writes are
// enforced by the Functions.
export function AppLayout() {
  const { user } = useSession()
  const location = useLocation()

  if (user === undefined) return <Loading what="your session" />
  if (user === null) {
    const next = location.pathname + location.search
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }
  return <SignedIn user={user} />
}

function SignedIn({ user }: { user: string }) {
  const { logout } = useSession()
  const navigate = useNavigate()
  const farms = useLive(loadFarms, NO_PARAMS, `*[_type == "farm"]`)

  async function signOut() {
    await logout()
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
              Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {farms.status === "ready" && <FarmSwitcher farms={farms.data} />}
            <ThemeToggle />
            <span className="text-muted hidden text-sm sm:inline">{user}</span>
            <button type="button" className="btn whitespace-nowrap" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </>
  )
}
