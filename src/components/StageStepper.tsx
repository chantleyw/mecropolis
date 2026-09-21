import { STAGE_LABEL } from "@/components/ui"
import { STAGES } from "@/lib/workflow/types"

export function StageStepper({ current }: { current: string }) {
  const at = STAGES.indexOf(current as (typeof STAGES)[number])
  return (
    <ol className="grid grid-cols-3 gap-y-5 sm:grid-cols-6">
      {STAGES.map((s, i) => {
        const done = i < at
        const active = i === at
        return (
          <li
            key={s}
            aria-current={active ? "step" : undefined}
            className="relative flex flex-col items-center text-center"
          >
            {i > 0 && (
              <span
                aria-hidden
                className={`absolute top-[13px] right-1/2 hidden h-0.5 w-full sm:block ${i <= at ? "bg-brand" : "bg-line"}`}
              />
            )}
            <span
              className={`relative z-10 grid h-7 w-7 place-items-center rounded-full border-2 text-xs font-bold ${
                done
                  ? "border-brand bg-brand text-brand-ink"
                  : active
                    ? "border-brand bg-surface text-brand ring-brand-soft ring-4"
                    : "border-line bg-surface text-muted"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={`mt-2 text-xs ${active ? "font-semibold" : done ? "" : "text-muted"}`}>
              {STAGE_LABEL[s]}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
