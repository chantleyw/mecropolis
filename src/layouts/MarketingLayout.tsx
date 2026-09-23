import { Link, Outlet } from "react-router"

import { BackButton } from "@/components/BackButton"
import { Brand } from "@/components/Brand"
import { ThemeToggle } from "@/components/ThemeToggle"
import { useSession } from "@/lib/session"

const NAV = [
  { to: "/#how", label: "How it works" },
  { to: "/about", label: "About" },
  { to: "/docs", label: "Docs" },
]

export function MarketingLayout() {
  const { user } = useSession()

  return (
    <>
      <header className="border-line bg-surface sticky top-0 z-20 border-b">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <BackButton />
            <Brand />
          </div>
          <nav aria-label="Main" className="hidden items-center gap-6 text-sm sm:flex">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="text-muted hover:text-ink">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to={user ? "/dashboard" : "/login"} className="btn btn-primary">
              {user ? "Dashboard" : "Sign in"}
            </Link>
          </div>
        </div>
      </header>
      <Outlet />
      <footer className="border-line border-t">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6">
          <div>
            <Brand />
            <p className="text-muted mt-3 max-w-xs text-sm">
              A field and crop tracker for Western Cape farms.
            </p>
          </div>
          <div>
            <p className="eyebrow">Project</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/about" className="hover:underline">
                  About
                </Link>
              </li>
              <li>
                <Link to="/docs" className="hover:underline">
                  Documentation
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  )
}
