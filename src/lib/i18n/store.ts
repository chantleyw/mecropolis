import { useSyncExternalStore } from "react"

import { en, type MessageKey } from "./en"

export type Messages = Partial<Record<MessageKey, string>>
export type Params = Record<string, string | number>

// The chosen language and its messages live in one module-level store so plain functions in
// src/lib (alerts, readiness) can translate too. Components subscribe through useI18n and re-render
// when the language changes. This module must not import the locale files, so it stays usable in
// tests and anywhere import.meta.glob is unavailable.
let lang = "en"
let messages: Messages = {}
let version = 0
const listeners = new Set<() => void>()

export function interpolate(text: string, params?: Params): string {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  )
}

/** Translate a key into the current language; a key the locale lacks shows the English text. */
export function t(key: MessageKey, params?: Params): string {
  return interpolate(messages[key] ?? en[key], params)
}

export function currentLang(): string {
  return lang
}

/**
 * The locale for Intl date and number formatting. English keeps the format each caller already
 * used (en-ZA or en-GB); any other language formats in that language.
 */
export function dateLocale(englishLocale: string): string {
  return lang === "en" ? englishLocale : lang
}

export function setLocale(next: string, nextMessages: Messages) {
  lang = next
  messages = nextMessages
  version++
  listeners.forEach((cb) => cb())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Re-renders the caller when the language changes. */
export function useI18n() {
  useSyncExternalStore(
    subscribe,
    () => version,
    () => version,
  )
  return { t, lang, dateLocale }
}
