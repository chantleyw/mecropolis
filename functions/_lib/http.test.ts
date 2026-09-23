import { describe, expect, it } from "vitest"

import { clientIp, readJsonBody } from "./http"

const url = "https://mecropolis.pages.dev/api/observations"

function post(body: BodyInit, headers: Record<string, string> = { "content-type": "application/json" }): Request {
  return new Request(url, { method: "POST", body, headers })
}

describe("readJsonBody", () => {
  it("parses a small JSON body", async () => {
    const result = await readJsonBody(post(JSON.stringify({ a: 1 })))
    expect(result).toEqual({ ok: true, value: { a: 1 } })
  })

  it("accepts a charset parameter", async () => {
    const result = await readJsonBody(post("{}", { "content-type": "application/json; charset=utf-8" }))
    expect(result.ok).toBe(true)
  })

  it("rejects a non-JSON content-type with 415", async () => {
    const result = await readJsonBody(post("{}", { "content-type": "text/plain" }))
    expect(result.ok ? 0 : result.response.status).toBe(415)
  })

  it("rejects a declared length over the cap with 413", async () => {
    const result = await readJsonBody(post("{}", { "content-type": "application/json", "content-length": "9000" }))
    expect(result.ok ? 0 : result.response.status).toBe(413)
  })

  it("rejects a streamed body over the cap with 413", async () => {
    const big = JSON.stringify({ notes: "x".repeat(100) })
    const result = await readJsonBody(post(big), 50)
    expect(result.ok ? 0 : result.response.status).toBe(413)
  })

  it("rejects malformed JSON with 400", async () => {
    const result = await readJsonBody(post("{nope"))
    expect(result.ok ? 0 : result.response.status).toBe(400)
  })
})

describe("clientIp", () => {
  it("returns null without CF-Connecting-IP", () => {
    expect(clientIp(new Request(url))).toBeNull()
  })

  it("returns the Cloudflare client address", () => {
    expect(clientIp(new Request(url, { headers: { "cf-connecting-ip": "203.0.113.7" } }))).toBe("203.0.113.7")
  })

  it.each([
    ["2001:db8:85a3:1:aaaa:bbbb:cccc:dddd", "2001:db8:85a3:1::/64"],
    ["2001:DB8:85A3:0001:1::2", "2001:db8:85a3:1::/64"],
    ["2001:db8::1", "2001:db8:0:0::/64"],
    ["::1", "0:0:0:0::/64"],
  ])("keys IPv6 %s on its /64", (ip, key) => {
    expect(clientIp(new Request(url, { headers: { "cf-connecting-ip": ip } }))).toBe(key)
  })
})
