import { useLocation, useNavigate } from "react-router"

import { rememberFarm } from "@/lib/dashboard/farmChoice"

interface Props {
  farms: { slug: string; name: string }[]
}

// Header control: choosing a farm opens its dashboard and remembers it for the picker.
export function FarmSwitcher({ farms }: Props) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const segment = pathname.startsWith("/dashboard/") ? pathname.split("/")[2] : undefined
  const current = segment ? decodeURIComponent(segment) : null
  if (farms.length < 2) return null
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="farm-switch" className="sr-only">
        Farm
      </label>
      <select
        id="farm-switch"
        key={current ?? "none"}
        defaultValue={current ?? ""}
        onChange={(e) => {
          const slug = e.currentTarget.value
          if (!slug) return
          rememberFarm(slug)
          void navigate(`/dashboard/${encodeURIComponent(slug)}`)
        }}
        className="input w-auto py-1.5 text-sm"
      >
        {current === null && <option value="">Choose a farm</option>}
        {farms.map((f) => (
          <option key={f.slug} value={f.slug}>
            {f.name}
          </option>
        ))}
      </select>
    </div>
  )
}
