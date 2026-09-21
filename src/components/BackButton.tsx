"use client"

import { usePathname, useRouter } from "next/navigation"

const ROOTS = new Set(["/", "/dashboard"])

export function BackButton() {
  const router = useRouter()
  const pathname = usePathname()
  if (ROOTS.has(pathname)) return null

  function goBack() {
    if (window.history.length > 1) router.back()
    else router.push("/")
  }

  return (
    <button type="button" onClick={goBack} className="btn" aria-label="Go back">
      <span aria-hidden="true">←</span> Back
    </button>
  )
}
