import { NextResponse } from "next/server"
import { auth } from "@/auth"

// Optimistic gate only. Route handlers and pages must still call auth().
export default auth((req) => {
  if (req.auth) return NextResponse.next()
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const url = new URL("/signin", req.nextUrl.origin)
  url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search)
  return NextResponse.redirect(url)
})

export const config = {
  // Public: the marketing pages (/, /about, /docs), sign-in page, Auth.js endpoints, the signature-verified Sanity webhook, static assets,
  // and /api/advance (its handler accepts a session or the cron Bearer token itself).
  matcher: [
    "/((?!$|about$|docs$|signin|api/auth|api/webhook|api/advance|_next/static|_next/image|favicon.ico).*)",
  ],
}
