import Link from "next/link"
import { auth, signOut } from "@/auth"
import { BackButton } from "@/components/BackButton"
import { Brand } from "@/components/Brand"
import { FarmSwitcher } from "@/components/FarmSwitcher"
import { ThemeToggle } from "@/components/ThemeToggle"
import { loadFarms } from "@/lib/sanity/queries"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const farms = session ? await loadFarms() : []

  async function logout() {
    "use server"
    await signOut({ redirectTo: "/signin" })
  }

  return (
    <>
      <header className="border-line bg-surface/85 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <BackButton />
            <Brand />
            <Link href="/dashboard" className="text-muted hover:text-ink hidden text-sm sm:inline">
              Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <FarmSwitcher farms={farms} />
            <ThemeToggle />
            {session?.user && (
              <form action={logout} className="flex items-center gap-3">
                <span className="text-muted hidden text-sm sm:inline">{session.user.name}</span>
                <button type="submit" className="btn">
                  Sign out
                </button>
              </form>
            )}
          </div>
        </div>
      </header>
      {children}
    </>
  )
}
