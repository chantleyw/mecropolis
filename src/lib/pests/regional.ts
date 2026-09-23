import { occurrenceUrl } from "@/lib/data/gbif"
import { haversineKm, type LatLng } from "@/lib/geo/distance"

export interface Occurrence {
  key: number
  eventDate?: string
  decimalLatitude?: number
  decimalLongitude?: number
}

export interface RegionalPest {
  pest: string
  sourceId: string
  sourceUrl: string
  date: string
  distanceKm: number
}

// Turns raw GBIF records into regional pest sightings with the distance from the field, nearest
// first. Records without coordinates or an event date are dropped: a sighting needs both.
export function toRegionalPests(
  pest: string,
  occurrences: Occurrence[],
  field: LatLng,
): RegionalPest[] {
  const out: RegionalPest[] = []
  for (const o of occurrences) {
    if (o.decimalLatitude === undefined || o.decimalLongitude === undefined || !o.eventDate) {
      continue
    }
    const km = haversineKm(field, { lat: o.decimalLatitude, lng: o.decimalLongitude })
    out.push({
      pest,
      sourceId: String(o.key),
      sourceUrl: occurrenceUrl(o.key),
      date: o.eventDate.slice(0, 10),
      distanceKm: Math.round(km * 10) / 10,
    })
  }
  return out.sort((a, b) => a.distanceKm - b.distanceKm)
}

// Regional reports are not assessed on the field, so severity and actions stay empty.
export function pestReportDoc(seasonId: string, fieldId: string, p: RegionalPest) {
  return {
    _id: `pestReport-gbif-${seasonId}-${p.sourceId}`,
    _type: "pestReport",
    field: { _type: "reference", _ref: fieldId },
    season: { _type: "reference", _ref: seasonId },
    date: p.date,
    source: "gbif",
    sourceId: p.sourceId,
    sourceUrl: p.sourceUrl,
    distanceKm: p.distanceKm,
    scope: "regional",
    severityBasis: `GBIF occurrence record ${p.distanceKm} km from the field; not observed on the field`,
    pest: p.pest,
    resolved: false,
  }
}
