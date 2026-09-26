import { describe, expect, it } from "vitest"

import { safeEqual } from "./crypto"
import { sameOrigin } from "./http"
import { createSessionToken, readCookie, SESSION_TTL_SECONDS, verifySessionToken } from "./session"

const SECRET = "s".repeat(40)

describe("session tokens", () => {
  it("round-trips a signed token", async () => {
    const token = await createSessionToken(SECRET, "demo", 1_000_000)
    expect(await verifySessionToken(SECRET, token, 1_000_000)).toEqual({
      user: "demo",
      expiresAt: (1000 + SESSION_TTL_SECONDS) * 1000,
    })
  })

  it("rejects a token signed with another secret", async () => {
    const token = await createSessionToken("x".repeat(40), "demo")
    expect(await verifySessionToken(SECRET, token)).toBeNull()
  })

  it("rejects a tampered payload", async () => {
    const token = await createSessionToken(SECRET, "demo")
    const [, sig] = token.split(".")
    const forged = btoa(JSON.stringify({ u: "admin", exp: 9_999_999_999 })).replace(/=+$/, "")
    expect(await verifySessionToken(SECRET, `${forged}.${sig}`)).toBeNull()
  })

  it("rejects an expired token", async () => {
    const token = await createSessionToken(SECRET, "demo", 0)
    expect(await verifySessionToken(SECRET, token, (SESSION_TTL_SECONDS + 1) * 1000)).toBeNull()
  })

  it("rejects malformed tokens", async () => {
    for (const bad of ["", "abc", "a.b.c", "!!.??"]) {
      expect(await verifySessionToken(SECRET, bad)).toBeNull()
    }
  })
})

describe("helpers", () => {
  it("compares strings", async () => {
    expect(await safeEqual("pw", "pw")).toBe(true)
    expect(await safeEqual("pw", "pW")).toBe(false)
    expect(await safeEqual("pw", "pw2")).toBe(false)
  })

  it("reads a cookie by name", () => {
    const req = new Request("https://x.test", {
      headers: { cookie: "a=1; mecro_session=t.s; b=2" },
    })
    expect(readCookie(req, "mecro_session")).toBe("t.s")
    expect(readCookie(req, "missing")).toBeNull()
  })

  it("requires a matching Origin", () => {
    const make = (origin?: string) =>
      new Request("https://app.test/api/x", { method: "POST", headers: origin ? { origin } : {} })
    expect(sameOrigin(make("https://app.test"))).toBe(true)
    expect(sameOrigin(make("https://evil.test"))).toBe(false)
    expect(sameOrigin(make())).toBe(false)
  })
})
