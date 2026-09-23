import type { ReactNode } from "react"

// Long-form page shell for About and Docs: a title block and a readable column.
export function Prose({
  title,
  lead,
  children,
}: {
  title: string
  lead?: string
  children: ReactNode
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-16 pb-24 sm:px-6">
      <h1 className="text-4xl font-semibold tracking-tight text-balance">{title}</h1>
      {lead && <p className="text-muted mt-4 text-lg text-pretty">{lead}</p>}
      <div className="[&_code]:bg-surface-2 [&_pre]:border-line [&_pre]:bg-surface-2 [&_td]:border-line mt-10 space-y-10 [&_a]:underline [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.85em] [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:font-semibold [&_li]:mt-1.5 [&_p]:mt-3 [&_p]:leading-relaxed [&_pre]:mt-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:p-4 [&_pre]:text-sm [&_table]:mt-3 [&_table]:w-full [&_table]:text-left [&_table]:text-sm [&_td]:border-t [&_td]:py-2 [&_td]:pr-4 [&_th]:pb-2 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </main>
  )
}
