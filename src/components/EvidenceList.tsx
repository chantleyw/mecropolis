import type { EvidenceRef } from "@/lib/evidence/types"

export function EvidenceList({ refs }: { refs: EvidenceRef[] }) {
  return (
    <ul className="divide-line divide-y text-sm">
      {refs.map((r, i) => (
        <li key={`${r.kind}-${i}`} className="py-2">
          <p className="eyebrow">{r.kind}</p>
          {r.kind === "sanity-doc" && (
            <p>
              {r.label}{" "}
              <span className="text-muted">
                ({r.docType}, {r.id})
              </span>
            </p>
          )}
          {r.kind === "weather-snapshot" && (
            <p>
              {r.label} <span className="text-muted">{r.id}</span>
            </p>
          )}
          {r.kind === "calculation" && (
            <>
              <p>
                {r.label}: <span className="font-medium">{r.result}</span>
              </p>
              {Object.keys(r.inputs).length > 0 && (
                <p className="text-muted text-xs">
                  {Object.entries(r.inputs)
                    .map(([k, v]) => `${k}=${v ?? "missing"}`)
                    .join(", ")}
                </p>
              )}
            </>
          )}
          {r.kind === "benchmark" && (
            <p>
              {r.label}: {r.resolved ? "resolved" : "not resolved"}
            </p>
          )}
          {r.kind === "external" && (
            <p>
              {r.label} <span className="text-muted">({r.source})</span>
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
