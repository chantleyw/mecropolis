import type { ReactNode } from "react"

// Native details/summary: collapsible with no client JavaScript.
export function CollapsibleSection({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string
  hint?: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <details open={defaultOpen} className="card group p-5 sm:p-6">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="text-base font-semibold">
          {title}
          {hint && <span className="text-muted ml-2 text-sm font-normal">{hint}</span>}
        </span>
        <span
          aria-hidden
          className="text-muted transition-transform duration-200 group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  )
}
