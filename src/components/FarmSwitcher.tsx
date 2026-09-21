"use client"

import { usePathname } from "next/navigation"
import { chooseFarm } from "@/app/(app)/dashboard/actions"

interface Props {
  farms: { slug: string; name: string }[]
}

// Header control: choosing a farm submits the same server action as the picker page.
export function FarmSwitcher({ farms }: Props) {
  const path = usePathname()
  const segment = path.startsWith("/dashboard/") ? path.split("/")[2] : undefined
  const current = segment ? decodeURIComponent(segment) : null
  if (farms.length < 2) return null
  return (
    <form action={chooseFarm} className="flex items-center gap-2">
      <label htmlFor="farm-switch" className="sr-only">
        Farm
      </label>
      <select
        id="farm-switch"
        name="farm"
        key={current ?? "none"}
        defaultValue={current ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="input w-auto py-1.5 text-sm"
      >
        {current === null && <option value="">Choose a farm</option>}
        {farms.map((f) => (
          <option key={f.slug} value={f.slug}>
            {f.name}
          </option>
        ))}
      </select>
    </form>
  )
}
