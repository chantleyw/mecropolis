import { Link } from "react-router"

// Mark: the seedling rising from a row of grid cells, cool to warm, as on the landing map.
export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <g fill="var(--ink)" transform="translate(-2.4 -5.5) scale(1.15)">
        <path d="M16 6c-1.7 1.9-1.7 4.6 0 7 1.7-2.4 1.7-5.1 0-7Z" />
        <path d="M16 19c-4.6 0-6.8-2.6-6.8-5.8 4.6 0 6.8 2.6 6.8 5.8Z" />
        <path d="M16 15.5c4.6 0 6.8-2.6 6.8-5.8-4.6 0-6.8 2.6-6.8 5.8Z" />
        <path d="M15 13h2v11h-2Z" />
      </g>
      <rect x="0" y="25" width="7.25" height="7" fill="var(--r1)" />
      <rect x="8.25" y="25" width="7.25" height="7" fill="var(--r3)" />
      <rect x="16.5" y="25" width="7.25" height="7" fill="var(--r4)" />
      <rect x="24.75" y="25" width="7.25" height="7" fill="var(--r6)" />
    </svg>
  )
}

// `compact` hides the wordmark on phones, where the app header also holds the farm switcher.
export function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
      <Logo />
      <span className={compact ? "sr-only sm:not-sr-only" : undefined}>Mecropolis</span>
    </Link>
  )
}
