import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const root = new URL("../", import.meta.url)
const html = readFileSync(new URL("index.html", root), "utf8")
const headers = readFileSync(new URL("public/_headers", root), "utf8")

describe("Content-Security-Policy in public/_headers", () => {
  it("allows every inline script in index.html by its sha256 hash", () => {
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1] ?? "")
    expect(scripts.length).toBeGreaterThan(0)
    for (const body of scripts) {
      const hash = createHash("sha256").update(body).digest("base64")
      expect(headers).toContain(`'sha256-${hash}'`)
    }
  })

  it("does not allow inline scripts or styles wholesale", () => {
    expect(headers).not.toContain("'unsafe-inline'")
    expect(headers).not.toContain("'unsafe-eval'")
  })
})
