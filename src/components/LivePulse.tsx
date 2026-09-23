// Shown beside data subscribed to Sanity's real-time listener; pings once the listener connects.
export function LivePulse({ live }: { live: boolean }) {
  return (
    <span className="text-muted inline-flex items-center gap-2 text-xs font-medium">
      <span
        aria-hidden
        className={`relative h-2 w-2 rounded-full ${live ? "ping bg-brand" : "bg-line"}`}
      />
      {live ? "Live" : "Connecting"}
    </span>
  )
}
