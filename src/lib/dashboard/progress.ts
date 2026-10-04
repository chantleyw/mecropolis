import { ttlCache } from "@/lib/cache/ttl"
import { cropModelFor } from "@/lib/agronomy/cropModel"
import { accumulateGdd, type GddPoint } from "@/lib/agronomy/gdd"
import type { MessageKey } from "@/lib/i18n/en"
import { t } from "@/lib/i18n/store"
import { fetchArchive } from "@/lib/weather/openmeteo"
import { seasonWindow } from "@/lib/workflow/effects"

const TTL_MS = 30 * 60 * 1000

// The English reasons are stored in results and translated when shown, so a language change
// updates reasons already loaded.
const REASON_KEYS: Record<string, MessageKey> = {
  "Farm coordinates not set": "dashboard.reason.coordinates",
  "No GDD model": "dashboard.reason.model",
  "No planting date": "dashboard.reason.planting",
  "Planting date is in the future": "dashboard.reason.future",
}

export function reasonText(reason: string): string {
  const key = REASON_KEYS[reason]
  return key ? t(key) : reason
}

export interface SeasonProgress {
  total: number
  maturity: number
  pct: number
  daysWithData: number
  daysInWindow: number
  /** Cumulative GDD per day, for comparison charts. */
  running: GddPoint[]
}

// Throws on a failed fetch so the error is not cached; the caller shows an unavailable state.
const cachedProgress = ttlCache(
  async (
    lat: number,
    lng: number,
    cropName: string,
    start: string,
    end: string,
  ): Promise<SeasonProgress> => {
    const model = cropModelFor(cropName)
    if (!model) throw new Error(`No GDD model for ${cropName}`)
    const series = await fetchArchive(lat, lng, start, end)
    const gdd = accumulateGdd(series.daily, { start, end }, model)
    return {
      total: gdd.total,
      maturity: model.gddToMaturity,
      pct: Math.min(100, Math.round((gdd.total / model.gddToMaturity) * 100)),
      daysWithData: gdd.daysWithData,
      daysInWindow: gdd.daysInWindow,
      running: gdd.running,
    }
  },
  TTL_MS,
)

export interface ProgressInput {
  lat: number | null | undefined
  lng: number | null | undefined
  /** Crop model key (`gddModelKey`) or, failing that, the crop name. */
  cropName: string | null
  plantingDate: string | null
  growthCycleDays: number | null
}

export type ProgressResult =
  | { status: "ok"; progress: SeasonProgress }
  | { status: "missing"; reason: string }
  | { status: "error"; reason: string }

export async function loadSeasonProgress(input: ProgressInput): Promise<ProgressResult> {
  const { lat, lng, cropName, plantingDate, growthCycleDays } = input
  if (lat == null || lng == null) return { status: "missing", reason: "Farm coordinates not set" }
  if (!cropName || !cropModelFor(cropName)) return { status: "missing", reason: "No GDD model" }
  if (!plantingDate || !growthCycleDays) return { status: "missing", reason: "No planting date" }
  const today = new Date().toISOString().slice(0, 10)
  const window = seasonWindow(plantingDate, growthCycleDays, today)
  if (!window) return { status: "missing", reason: "Planting date is in the future" }
  try {
    return {
      status: "ok",
      progress: await cachedProgress(lat, lng, cropName, window.start, window.end),
    }
  } catch (e) {
    return { status: "error", reason: e instanceof Error ? e.message : String(e) }
  }
}
