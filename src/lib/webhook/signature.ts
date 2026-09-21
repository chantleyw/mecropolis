import { createHmac, timingSafeEqual } from "node:crypto"

const HEADER = /^t=(\d+)[, ]+v1=([^, ]+)$/
const MAX_AGE_MS = 5 * 60_000

// Sanity signs `${timestamp}.${rawBody}` with HMAC-SHA256 and sends base64url in the
// `sanity-webhook-signature` header as `t=<ms>,v1=<sig>`. Verify against the raw body.
export function isValidSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  now = Date.now(),
): boolean {
  const match = header ? HEADER.exec(header) : null
  if (!match) return false
  const [, timestamp, signature] = match
  if (!timestamp || !signature) return false
  if (Math.abs(now - Number(timestamp)) > MAX_AGE_MS) return false

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("base64url")
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function signPayload(rawBody: string, secret: string, timestamp = Date.now()): string {
  const sig = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("base64url")
  return `t=${timestamp},v1=${sig}`
}
