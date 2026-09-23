import { Link } from "react-router"
import { Badge } from "@/components/ui"
import type { Alert } from "@/lib/dashboard/alerts"

const LABEL: Record<Alert["tone"], string> = { warn: "Act", heat: "Watch", sky: "Note" }

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return (
      <p className="card text-muted p-5 text-sm">
        Nothing needs attention. Alerts are checked against stage, GDD progress and the 14-day
        forecast.
      </p>
    )
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {alerts.map((a) => (
        <li key={a.key} className="card flex items-start gap-3 p-4">
          <Badge tone={a.tone}>{LABEL[a.tone]}</Badge>
          <div className="min-w-0 text-sm">
            <p className="font-medium">
              {a.seasonId ? (
                <Link to={`/seasons/${encodeURIComponent(a.seasonId)}`} className="hover:underline">
                  {a.title}
                </Link>
              ) : (
                a.title
              )}
            </p>
            <p className="text-muted mt-0.5">{a.evidence}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
