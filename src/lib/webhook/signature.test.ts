import { describe, expect, it } from "vitest"
import { isValidSignature, signPayload } from "./signature"

const secret = "test-secret"
const body = JSON.stringify({ _id: "abc" })
const now = 1_800_000_000_000

describe("isValidSignature", () => {
  it("accepts a correctly signed body", () => {
    expect(isValidSignature(body, signPayload(body, secret, now), secret, now)).toBe(true)
  })
  it("rejects a tampered body", () => {
    const tampered = JSON.stringify({ _id: "x" })
    expect(isValidSignature(tampered, signPayload(body, secret, now), secret, now)).toBe(false)
  })
  it("rejects the wrong secret", () => {
    expect(isValidSignature(body, signPayload(body, "other", now), secret, now)).toBe(false)
  })
  it("rejects a missing or malformed header", () => {
    expect(isValidSignature(body, null, secret, now)).toBe(false)
    expect(isValidSignature(body, "garbage", secret, now)).toBe(false)
  })
  it("rejects a stale timestamp", () => {
    const old = signPayload(body, secret, now - 10 * 60_000)
    expect(isValidSignature(body, old, secret, now)).toBe(false)
  })
})
