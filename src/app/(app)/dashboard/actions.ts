"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { FARM_COOKIE } from "@/lib/dashboard/farmCookie"
import { loadFarms } from "@/lib/sanity/queries"

// An empty `farm` clears the remembered choice and returns to the picker. The slug is checked
// against the farms in Sanity before it is stored, so the cookie never holds arbitrary input.
export async function chooseFarm(formData: FormData) {
  if (!(await auth())) redirect("/signin")
  const slug = String(formData.get("farm") ?? "")
  const jar = await cookies()

  if (slug === "") {
    jar.delete(FARM_COOKIE)
    redirect("/dashboard?pick=1")
  }
  const farms = await loadFarms()
  if (!farms.some((f) => f.slug === slug)) redirect("/dashboard?pick=1")

  jar.set(FARM_COOKIE, slug, {
    httpOnly: true,
    sameSite: "lax",
    secure: (await headers()).get("x-forwarded-proto") === "https",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  })
  redirect(`/dashboard/${encodeURIComponent(slug)}`)
}
