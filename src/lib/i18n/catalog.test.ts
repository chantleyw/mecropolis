import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { common } from "./catalog/common"
import { dashboard } from "./catalog/dashboard"
import { docs } from "./catalog/docs"
import { guide } from "./catalog/guide"
import { publicPages } from "./catalog/public"
import { season } from "./catalog/season"
import { en } from "./en"
import { browserLanguage, isLanguage, LANGUAGES } from "./languages"
import { interpolate, setLocale, t } from "./store"

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)]
    .map((m) => m[1])
    .sort()
    .join()

const dir = fileURLToPath(new URL("./locales/", import.meta.url))
const locales = readdirSync(dir).filter((f) => f.endsWith(".json"))

describe("English catalog", () => {
  it("has no key defined in two catalog files", () => {
    const parts = [common, publicPages, docs, guide, dashboard, season]
    const total = parts.reduce((n, p) => n + Object.keys(p).length, 0)
    expect(Object.keys(en)).toHaveLength(total)
  })

  it("lists every language once", () => {
    const codes = LANGUAGES.map(([c]) => c)
    expect(new Set(codes).size).toBe(codes.length)
  })
})

describe.each(locales)("locale %s", (file) => {
  const messages = JSON.parse(readFileSync(`${dir}${file}`, "utf8")) as Record<string, string>

  it("is a listed language", () => {
    expect(isLanguage(file.replace(/\.json$/, ""))).toBe(true)
  })

  it("has exactly the English keys", () => {
    expect(Object.keys(messages).sort()).toEqual(Object.keys(en).sort())
  })

  it("keeps every placeholder and has no empty text", () => {
    for (const [key, english] of Object.entries(en)) {
      const text = messages[key] ?? ""
      expect(text.trim(), key).not.toBe("")
      expect(placeholders(text), key).toBe(placeholders(english))
    }
  })
})

describe("t", () => {
  it("fills placeholders and leaves unknown ones as written", () => {
    expect(interpolate("Loading {what}… {other}", { what: "farms" })).toBe("Loading farms… {other}")
  })

  it("shows English for a key the locale lacks", () => {
    setLocale("af", { "common.back": "Terug" })
    expect(t("common.back")).toBe("Terug")
    expect(t("common.live")).toBe("Live")
    setLocale("en", {})
  })
})

describe("browserLanguage", () => {
  it("matches exact, base and Chinese script tags, else English", () => {
    expect(browserLanguage(["af-ZA"])).toBe("af")
    expect(browserLanguage(["zh-HK"])).toBe("zh-TW")
    expect(browserLanguage(["zh"])).toBe("zh-CN")
    expect(browserLanguage(["nn-NO"])).toBe("nb")
    expect(browserLanguage(["xx", "fr-CA"])).toBe("fr")
    expect(browserLanguage(["xx"])).toBe("en")
  })
})
