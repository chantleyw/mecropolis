import { Link } from "react-router"
import { Badge } from "@/components/ui"
import type { Alert } from "@/lib/dashboard/alerts"
import type { MessageKey } from "@/lib/i18n/en"
import { useI18n } from "@/lib/i18n/store"

const LABEL: Record<Alert["tone"], MessageKey> = {
  warn: "dashboard.alert.act",
  heat: "dashboard.alert.watch",
  sky: "dashboard.alert.note",
}

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  const { t } = useI18n()
  if (alerts.length === 0) {
    return <p className="card text-muted p-5 text-sm">{t("dashboard.alert.none")}</p>
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {alerts.map((a) => (
        <li key={a.key} className="card flex items-start gap-3 p-4">
          <Badge tone={a.tone}>{t(LABEL[a.tone])}</Badge>
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
