import { createHmac } from "node:crypto"

import { describe, expect, it } from "vitest"

import { isValidSignature, signPayload } from "./signature"

const secret = "test-secret"
const body = JSON.stringify({ _id: "abc" })
const now = 1_800_000_000_000

describe("isValidSignature", () => {
  it("accepts a correctly signed body", async () => {
    expect(await isValidSignature(body, await signPayload(body, secret, now), secret, now)).toBe(
      true,
    )
  })
  it("matches Sanity's HMAC-SHA256 base64url format", async () => {
    const sig = createHmac("sha256", secret).update(`${now}.${body}`).digest("base64url")
    expect(await isValidSignature(body, `t=${now},v1=${sig}`, secret, now)).toBe(true)
  })
  it("rejects a tampered body", async () => {
    const tampered = JSON.stringify({ _id: "x" })
    expect(
      await isValidSignature(tampered, await signPayload(body, secret, now), secret, now),
    ).toBe(false)
  })
  it("rejects the wrong secret", async () => {
    expect(await isValidSignature(body, await signPayload(body, "other", now), secret, now)).toBe(
      false,
    )
  })
  it("rejects a missing or malformed header", async () => {
    expect(await isValidSignature(body, null, secret, now)).toBe(false)
    expect(await isValidSignature(body, "garbage", secret, now)).toBe(false)
  })
  it("rejects a stale timestamp", async () => {
    const old = await signPayload(body, secret, now - 10 * 60_000)
    expect(await isValidSignature(body, old, secret, now)).toBe(false)
  })
})
