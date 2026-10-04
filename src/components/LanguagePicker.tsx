import { useState } from "react"

import { changeLanguage, getStartupError, hasTranslation } from "@/lib/i18n/loader"
import { LANGUAGES, nativeName } from "@/lib/i18n/languages"
import { useI18n } from "@/lib/i18n/store"

// Only languages with a translation file are offered, so a choice never falls back to English.
const OPTIONS = LANGUAGES.filter(([code]) => hasTranslation(code)).map(([code, english]) => ({
  code,
  name: nativeName(code, english),
}))

export function LanguagePicker() {
  const { t, lang } = useI18n()
  const [error, setError] = useState<string | null>(getStartupError)

  async function pick(code: string) {
    setError(null)
    try {
      await changeLanguage(code)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.requestFailed"))
    }
  }

  return (
    <>
      <label htmlFor="language" className="sr-only">
        {t("common.language")}
      </label>
      <select
        id="language"
        value={lang}
        onChange={(e) => void pick(e.currentTarget.value)}
        className="input w-auto max-w-[5rem] shrink-0 py-1.5 text-sm sm:max-w-[9rem]"
        title={t("common.language")}
        aria-describedby={error ? "language-error" : undefined}
      >
        {OPTIONS.map((o) => (
          <option key={o.code} value={o.code} lang={o.code}>
            {o.name}
          </option>
        ))}
      </select>
      {error && (
        <span id="language-error" role="alert" className="text-warn text-xs">
          {error}
        </span>
      )}
    </>
  )
}
