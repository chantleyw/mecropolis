import Link from "next/link"
import { auth } from "@/auth"
import { Brand } from "@/components/Brand"
import { ThemeToggle } from "@/components/ThemeToggle"

const NAV = [
  { href: "/#how", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/docs", label: "Docs" },
]

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const signedIn = Boolean(await auth())

  return (
    <>
      <header className="border-line bg-surface/85 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <nav aria-label="Main" className="hidden items-center gap-6 text-sm sm:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="text-muted hover:text-ink">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href={signedIn ? "/dashboard" : "/signin"} className="btn btn-primary">
              {signedIn ? "Dashboard" : "Sign in"}
            </Link>
          </div>
        </div>
      </header>
      {children}
      <footer className="border-line mt-24 border-t">
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
                <Link href="/about" className="hover:underline">
                  About
                </Link>
              </li>
              <li>
                <Link href="/docs" className="hover:underline">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/studio" className="hover:underline">
                  Sanity Studio (sign-in required)
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  )
}
