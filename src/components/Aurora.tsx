// Decorative gradient backdrop. Soft colour washes sit in the top corners and never behind the text
// column, and it follows the theme tokens.
export function Aurora({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div
        className="absolute -top-40 -right-32 h-[34rem] w-[34rem] rounded-full opacity-80 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--brand-soft), transparent 68%)" }}
      />
      <div
        className="absolute -top-24 right-1/3 h-[24rem] w-[24rem] rounded-full opacity-70 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--sky-soft), transparent 68%)" }}
      />
      <div
        className="absolute top-40 -right-16 h-[22rem] w-[22rem] rounded-full opacity-70 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--heat-soft), transparent 68%)" }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, var(--line), transparent)" }}
      />
    </div>
  )
}
