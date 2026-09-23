import { Link } from "react-router"

// Mark: a seedling rising from a furrow, on the brand colour.
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--brand-2)" />
          <stop offset="1" stopColor="var(--brand)" />
        </linearGradient>
        <linearGradient id="logo-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#logo-g)" />
      <rect width="32" height="16" rx="8" fill="url(#logo-gloss)" />
      <g fill="var(--brand-ink)">
        <path d="M16 6c-1.7 1.9-1.7 4.6 0 7 1.7-2.4 1.7-5.1 0-7Z" />
        <path d="M16 19c-4.6 0-6.8-2.6-6.8-5.8 4.6 0 6.8 2.6 6.8 5.8Z" />
        <path d="M16 15.5c4.6 0 6.8-2.6 6.8-5.8-4.6 0-6.8 2.6-6.8 5.8Z" />
      </g>
      <g stroke="var(--brand-ink)" strokeWidth="1.8" strokeLinecap="round" fill="none">
        <path d="M16 13v13" />
        <path d="M6.5 27c4.5-2.2 14.5-2.2 19 0" opacity="0.65" />
      </g>
    </svg>
  )
}

export function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
      <Logo />
      Mecropolis
    </Link>
  )
}
