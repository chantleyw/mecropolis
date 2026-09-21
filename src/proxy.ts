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
  // Public: sign-in page, Auth.js endpoints, the signature-verified Sanity webhook, static assets.
  matcher: ["/((?!signin|api/auth|api/webhook|_next/static|_next/image|favicon.ico).*)"],
}
