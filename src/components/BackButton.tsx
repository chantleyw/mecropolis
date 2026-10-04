import { useLocation, useNavigate } from "react-router"

import { useI18n } from "@/lib/i18n/store"

const ROOTS = new Set(["/", "/dashboard"])

export function BackButton() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  if (ROOTS.has(pathname)) return null

  function goBack() {
    // React Router stores its history index in history.state; 0 means this is the first entry.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) void navigate(-1)
    else void navigate("/")
  }

  return (
    <button type="button" onClick={goBack} className="btn" aria-label={t("common.goBack")}>
      <span aria-hidden="true">←</span>
      <span className="hidden sm:inline">{t("common.back")}</span>
    </button>
  )
}
