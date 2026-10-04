import { browserLanguage, isLanguage, isRtl } from "./languages"
import { setLocale, type Messages } from "./store"

const KEY = "mecropolis-lang"

let startupError: string | null = null

/** Why the saved or browser language failed to load at startup, for the picker to show. */
export function setStartupError(message: string) {
  startupError = message
}

export function getStartupError(): string | null {
  return startupError
}

// One lazy chunk per language; English needs no file.
const LOCALES = import.meta.glob<Messages>("./locales/*.json", { import: "default" })

function savedLanguage(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    // Storage blocked: fall back to the browser's languages.
    return null
  }
}

/** Load a language's messages, then switch the page to it. Throws when the file cannot load. */
export async function changeLanguage(code: string, remember = true): Promise<void> {
  if (!isLanguage(code)) throw new Error(`Unknown language: ${code}`)
  let messages: Messages = {}
  if (code !== "en") {
    const load = LOCALES[`./locales/${code}.json`]
    if (!load) throw new Error(`No translation file for ${code}`)
    messages = await load()
  }
  setLocale(code, messages)
  document.documentElement.lang = code
  document.documentElement.dir = isRtl(code) ? "rtl" : "ltr"
  if (remember) {
    try {
      localStorage.setItem(KEY, code)
    } catch {
      // Storage blocked: the choice applies for this page view only.
    }
  }
}

/** The saved choice, else the browser's language, else English; only languages with a file. */
export function startLanguage(): string {
  const saved = savedLanguage()
  if (saved && hasTranslation(saved)) return saved
  const preferred = browserLanguage(navigator.languages)
  return hasTranslation(preferred) ? preferred : "en"
}

export function hasTranslation(code: string): boolean {
  return code === "en" || `./locales/${code}.json` in LOCALES
}
