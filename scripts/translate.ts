// Writes src/lib/i18n/locales/<code>.json for each language from the English catalog, through
// Sanity Agent Actions (prompt, JSON format). Each reply is checked: every key present, non-empty,
// and the same {placeholders} as the English. A chunk that fails the check is asked once more with
// only the bad keys; if it fails again the script stops and names them.
//
// Run: npm run translate -- --lang af,xh   (only these languages, keys they are missing)
//      npm run translate -- --missing      (every listed language, keys it is missing)
//      add --keys a.b,c.d to retranslate those keys after their English changed
//      add --concurrency 4 to change how many languages run at once
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { createClient } from "@sanity/client"

import { en, type MessageKey } from "../src/lib/i18n/en"
import { LANGUAGES } from "../src/lib/i18n/languages"

const required = (name: string): string => {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

const client = createClient({
  projectId: required("VITE_SANITY_PROJECT_ID"),
  dataset: required("VITE_SANITY_DATASET"),
  apiVersion: "vX", // Agent Actions are only served on vX.
  token: required("SANITY_API_WRITE_TOKEN"),
  useCdn: false,
})

const CHUNK = 100
const LOCALES = new URL("../src/lib/i18n/locales/", import.meta.url)

const INSTRUCTION = `You translate the screen text of Mecropolis, a field and crop tracker for farmers, into $language.

Write the way a farmer who speaks $language would say it to another farmer: plain everyday words, short and natural sentences. Translate the meaning, never word for word. When a technical term has a common farming word, use that word. When it has none, keep a short explanation in plain words, for example "heat units (GDD)".

Rules:
- Keep every {placeholder} in curly braces exactly as written, untranslated, and keep each one exactly once.
- Keep these unchanged: Mecropolis, Sanity, Open-Meteo, GBIF, USDA, FAS, PSD, SoilGrids, CSV, PDF, API, GDD, Latin species names, units such as °C, mm, ha, t/ha, kg, and anything inside backticks.
- Keep the text short enough to fit on a button or label when the English is short.
- Use the script and spelling normally used for $language.

The input is a JSON object of key to English text. Reply with a JSON object that has exactly the same keys, each mapped to its $language text. Input:
$strings`

type Strings = Record<string, string>

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

function problems(source: Strings, reply: unknown): string[] {
  if (typeof reply !== "object" || reply === null) return Object.keys(source)
  const out = reply as Record<string, unknown>
  return Object.keys(source).filter((key) => {
    const value = out[key]
    if (typeof value !== "string" || !value.trim()) return true
    return placeholders(value).join() !== placeholders(source[key] ?? "").join()
  })
}

// The reply is checked by problems() before any value is used.
async function ask(language: string, source: Strings): Promise<Record<string, unknown>> {
  const reply: unknown = await client.agent.action.prompt({
    instruction: INSTRUCTION,
    instructionParams: { language, strings: JSON.stringify(source) },
    format: "json",
    temperature: 0.2,
  })
  return typeof reply === "object" && reply !== null ? (reply as Record<string, unknown>) : {}
}

async function translateChunk(language: string, source: Strings): Promise<Strings> {
  const first = await ask(language, source)
  const bad = problems(source, first)
  const result: Strings = {}
  for (const key of Object.keys(source)) {
    if (!bad.includes(key)) result[key] = String(first[key])
  }
  if (bad.length === 0) return result
  const retrySource = Object.fromEntries(bad.map((k) => [k, source[k] ?? ""]))
  const second = await ask(language, retrySource)
  const stillBad = problems(retrySource, second)
  if (stillBad.length > 0) {
    throw new Error(`${language}: bad translation after retry for ${stillBad.join(", ")}`)
  }
  for (const key of bad) result[key] = String(second[key])
  return result
}

function readLocale(code: string): Strings {
  const file = new URL(`${code}.json`, LOCALES)
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Strings) : {}
}

async function translateLanguage(code: string, english: string, forceKeys: Set<string>) {
  const existing = readLocale(code)
  const todo = (Object.keys(en) as MessageKey[]).filter(
    (key) => forceKeys.has(key) || !(key in existing),
  )
  const next: Strings = {}
  // Drop keys the English catalog no longer has.
  for (const key of Object.keys(en)) if (key in existing) next[key] = existing[key] ?? ""
  for (let i = 0; i < todo.length; i += CHUNK) {
    const keys = todo.slice(i, i + CHUNK)
    const source = Object.fromEntries(keys.map((k) => [k, en[k]]))
    Object.assign(next, await translateChunk(english, source))
    // Write after every chunk so a stopped run keeps its work.
    const ordered = Object.fromEntries(
      Object.keys(en).flatMap((k) => (k in next ? [[k, next[k]]] : [])),
    )
    writeFileSync(new URL(`${code}.json`, LOCALES), `${JSON.stringify(ordered, null, 2)}\n`)
  }
  process.stdout.write(`${code}: ${todo.length} strings translated\n`)
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? undefined : process.argv[i + 1]
}

async function main() {
  const only = arg("lang")?.split(",")
  if (!only && !process.argv.includes("--missing")) {
    throw new Error("Pass --lang <codes> or --missing")
  }
  const forceKeys = new Set(arg("keys")?.split(",") ?? [])
  for (const key of forceKeys) if (!(key in en)) throw new Error(`Unknown key: ${key}`)
  const languages = LANGUAGES.filter(([code]) => code !== "en" && (!only || only.includes(code)))
  if (only && languages.length !== only.length)
    throw new Error(`Unknown language in ${only.join()}`)

  const concurrency = Number(arg("concurrency") ?? 4)
  const queue = [...languages]
  const failures: string[] = []
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        const [code, english] = next
        try {
          await translateLanguage(code, english, forceKeys)
        } catch (e) {
          failures.push(`${code}: ${e instanceof Error ? e.message : String(e)}`)
        }
      }
    }),
  )
  if (failures.length > 0) throw new Error(`Failed languages:\n${failures.join("\n")}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e: unknown) => {
    process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`)
    process.exit(1)
  })
}
