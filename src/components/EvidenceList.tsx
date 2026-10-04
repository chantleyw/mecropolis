import { useI18n } from "@/lib/i18n/store"
import type { EvidenceRef } from "@/lib/evidence/types"

export function EvidenceList({ refs }: { refs: EvidenceRef[] }) {
  const { t } = useI18n()

  // The stored label is English (it is also saved with recommendations), so the known references
  // are labelled from their structure; anything else shows the stored label.
  function label(r: EvidenceRef): string {
    if (r.kind === "sanity-doc") {
      if (r.docType === "season") return t("season.evidence.doc.season")
      if (r.docType === "crop") return t("season.evidence.doc.crop")
      if (r.docType === "field") return t("season.evidence.doc.field")
    }
    if (r.kind === "weather-snapshot") return t("season.evidence.snapshot")
    if (r.kind === "benchmark") return t("season.evidence.benchmark")
    if (r.kind === "calculation") {
      if (r.name === "cropModel") return t("season.evidence.calc.cropModel")
      if (r.name === "gdd") return t("season.evidence.calc.gdd")
      if (r.name.startsWith("guard.")) {
        return t("season.evidence.calc.guard", { name: r.name.slice("guard.".length) })
      }
    }
    return r.label
  }

  return (
    <ul className="divide-line divide-y text-sm">
      {refs.map((r, i) => (
        <li key={`${r.kind}-${i}`} className="py-2">
          <p className="eyebrow">{t(`season.evidence.kind.${r.kind}` as const)}</p>
          {r.kind === "sanity-doc" && (
            <p>
              {label(r)}{" "}
              <span className="text-muted">
                ({r.docType}, {r.id})
              </span>
            </p>
          )}
          {r.kind === "weather-snapshot" && (
            <p>
              {label(r)} <span className="text-muted">{r.id}</span>
            </p>
          )}
          {r.kind === "calculation" && (
            <>
              <p>
                {label(r)}:{" "}
                <span className="font-medium">
                  {r.name.startsWith("guard.") && r.result === "passed"
                    ? t("season.evidence.passed")
                    : r.result}
                </span>
              </p>
              {Object.keys(r.inputs).length > 0 && (
                <p className="text-muted text-xs">
                  {Object.entries(r.inputs)
                    .map(([k, v]) => `${k}=${v ?? t("season.evidence.missing")}`)
                    .join(", ")}
                </p>
              )}
            </>
          )}
          {r.kind === "benchmark" && (
            <p>
              {label(r)}:{" "}
              {r.resolved ? t("season.evidence.resolved") : t("season.evidence.notResolved")}
            </p>
          )}
          {r.kind === "external" && (
            <p>
              {label(r)} <span className="text-muted">({r.source})</span>
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
