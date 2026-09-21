import Link from "next/link"

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
      <span
        aria-hidden
        className="bg-brand text-brand-ink grid h-7 w-7 place-items-center rounded-lg text-sm"
      >
        M
      </span>
      Mecropolis
    </Link>
  )
}
