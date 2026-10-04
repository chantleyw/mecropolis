import { Link, Outlet } from "react-router"

import { BackButton } from "@/components/BackButton"
import { Brand } from "@/components/Brand"
import { LanguagePicker } from "@/components/LanguagePicker"
import { ThemeToggle } from "@/components/ThemeToggle"
import type { MessageKey } from "@/lib/i18n/en"
import { useI18n } from "@/lib/i18n/store"
import { useSession } from "@/lib/session"

const NAV: { to: string; label: MessageKey }[] = [
  { to: "/#how", label: "nav.howItWorks" },
  { to: "/guide", label: "nav.guide" },
  { to: "/about", label: "nav.about" },
  { to: "/docs", label: "nav.docs" },
]

export function MarketingLayout() {
  const { t } = useI18n()
  const { user } = useSession()

  return (
    <>
      <header className="border-line bg-surface sticky top-0 z-20 border-b">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <BackButton />
            <Brand compact />
          </div>
          <nav aria-label={t("nav.main")} className="hidden items-center gap-6 text-sm sm:flex">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="text-muted hover:text-ink">
                {t(n.label)}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LanguagePicker />
            <ThemeToggle />
            <Link to={user ? "/dashboard" : "/login"} className="btn btn-primary whitespace-nowrap">
              {user ? t("nav.dashboard") : t("nav.signIn")}
            </Link>
          </div>
        </div>
      </header>
      <Outlet />
      <footer className="border-line border-t">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6">
          <div>
            <Brand />
            <p className="text-muted mt-3 max-w-xs text-sm">{t("nav.footerTagline")}</p>
          </div>
          <div>
            <p className="eyebrow">{t("nav.project")}</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/guide" className="hover:underline">
                  {t("nav.guide")}
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:underline">
                  {t("nav.about")}
                </Link>
              </li>
              <li>
                <Link to="/docs" className="hover:underline">
                  {t("nav.documentation")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  )
}
