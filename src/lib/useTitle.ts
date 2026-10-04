import { useEffect } from "react"

import { useI18n } from "@/lib/i18n/store"

// `title` is already translated by the caller.
export function useTitle(title: string | null) {
  const { t, lang } = useI18n()
  useEffect(() => {
    document.title = title ? `${title} | Mecropolis` : t("common.titleBase")
  }, [title, t, lang])
}
