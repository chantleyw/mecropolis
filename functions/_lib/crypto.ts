const encoder = new TextEncoder()

export function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let bin = ""
  for (const b of arr) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function fromBase64url(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"))
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  )
}

export async function hmacSign(secret: string, data: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(data))
  return base64url(sig)
}

export async function hmacVerify(
  secret: string,
  data: string,
  signature: string,
): Promise<boolean> {
  let sig: Uint8Array<ArrayBuffer>
  try {
    sig = fromBase64url(signature)
  } catch {
    return false // not valid base64: treat as a bad signature, never as an error
  }
  return crypto.subtle.verify("HMAC", await hmacKey(secret), sig, encoder.encode(data))
}

// Constant-time string comparison: HMAC both sides under a per-call random key and compare the
// digests with crypto.subtle.verify, so timing does not depend on where the inputs differ.
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const key = base64url(crypto.getRandomValues(new Uint8Array(32)))
  return hmacVerify(key, a, await hmacSign(key, b))
}
