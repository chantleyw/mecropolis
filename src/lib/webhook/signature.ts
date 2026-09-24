const HEADER = /^t=(\d+)[, ]+v1=([^, ]+)$/
const MAX_AGE_MS = 5 * 60_000
const encoder = new TextEncoder()

// Web Crypto, so this runs in Workers (Pages Functions) as well as Node and the browser.
async function sign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data)))
  let bin = ""
  for (const b of sig) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

// Compares two strings without an early exit on the first differing character.
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// Sanity signs `${timestamp}.${rawBody}` with HMAC-SHA256 and sends base64url in the
// `sanity-webhook-signature` header as `t=<ms>,v1=<sig>`. Verify against the raw body.
export async function isValidSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  now = Date.now(),
): Promise<boolean> {
  const match = header ? HEADER.exec(header) : null
  if (!match) return false
  const [, timestamp, signature] = match
  if (!timestamp || !signature) return false
  if (Math.abs(now - Number(timestamp)) > MAX_AGE_MS) return false
  return constantTimeEqual(signature, await sign(secret, `${timestamp}.${rawBody}`))
}

export async function signPayload(
  rawBody: string,
  secret: string,
  timestamp = Date.now(),
): Promise<string> {
  return `t=${timestamp},v1=${await sign(secret, `${timestamp}.${rawBody}`)}`
}
