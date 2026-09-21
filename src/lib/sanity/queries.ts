import "server-only"
import { writeClient } from "@/lib/sanity/writeClient"

export interface OverviewSeason {
  _id: string
  year: number
  stage: string | null
  cropName: string | null
  gddModelKey: string | null
  plantingDate: string | null
  expectedHarvest: string | null
  growthCycleDays: number | null
  pestCount: number
}

type Coordinates = { lat: number | null; lng: number | null } | null

export interface FarmSummary {
  _id: string
  name: string
  slug: string
  location: string | null
  coordinates: Coordinates
  fieldCount: number
  hectares: number
  activeSeasons: number
}

export interface FarmOverview {
  farm: {
    name: string
    slug: string
    location: string | null
    coordinates: Coordinates
  } | null
  fields: {
    _id: string
    name: string
    hectares: number | null
    soilType: string | null
    colour: string | null
    /** The field's own point when set, otherwise the farm's. */
    coordinates: Coordinates
    ownCoordinates: boolean
    seasons: OverviewSeason[]
  }[]
}

const FIELD_POINT = `select(defined(coordinates) => coordinates{lat, lng}, farm->coordinates{lat, lng})`

export function loadFarms(): Promise<FarmSummary[]> {
  return writeClient.fetch<FarmSummary[]>(
    `*[_type == "farm" && defined(slug.current)] | order(name asc){
      _id, name, "slug": slug.current, location,
      "coordinates": coordinates{lat, lng},
      "fieldCount": count(*[_type == "field" && farm._ref == ^._id]),
      "hectares": math::sum(*[_type == "field" && farm._ref == ^._id].hectares),
      "activeSeasons": count(*[_type == "season" && stage != "review" && field->farm._ref == ^._id])
    }`,
  )
}

export async function loadFarmOverview(slug: string): Promise<FarmOverview> {
  const [farm, fields] = await Promise.all([
    writeClient.fetch<FarmOverview["farm"]>(
      `*[_type == "farm" && slug.current == $slug][0]{
        name, "slug": slug.current, location, "coordinates": coordinates{lat, lng}
      }`,
      { slug },
    ),
    writeClient.fetch<FarmOverview["fields"]>(
      `*[_type == "field" && farm->slug.current == $slug] | order(name asc){
        _id, name, hectares, soilType, colour,
        "coordinates": ${FIELD_POINT},
        "ownCoordinates": defined(coordinates),
        "seasons": *[_type == "season" && field._ref == ^._id] | order(year desc){
          _id, year, stage, plantingDate, expectedHarvest,
          "cropName": crop->name,
          "gddModelKey": crop->gddModelKey,
          "growthCycleDays": crop->growthCycleDays,
          "pestCount": count(*[_type == "pestReport" && season._ref == ^._id])
        }
      }`,
      { slug },
    ),
  ])
  return { farm, fields }
}

export interface ActivityEntry {
  seasonId: string
  seasonLabel: string
  fieldName: string | null
  stage: string | null
  previousStage: string | null
  effectiveDate: string | null
  timestamp: string | null
  basis: string | null
  triggeredBy: string | null
}

const ACTIVITY_LIMIT = 20

// Latest stage changes across one farm's seasons, newest first.
export async function loadRecentActivity(slug: string): Promise<ActivityEntry[]> {
  const seasons = await writeClient.fetch<
    {
      _id: string
      year: number
      cropName: string | null
      fieldName: string | null
      history: Omit<ActivityEntry, "seasonId" | "seasonLabel" | "fieldName">[] | null
    }[]
  >(
    `*[_type == "season" && count(stageHistory) > 0 && field->farm->slug.current == $slug]{
      _id, year,
      "cropName": crop->name,
      "fieldName": field->name,
      "history": stageHistory[]{stage, previousStage, effectiveDate, timestamp, basis, triggeredBy}
    }`,
    { slug },
  )
  return seasons
    .flatMap((s) =>
      (s.history ?? []).map((h) => ({
        ...h,
        seasonId: s._id,
        seasonLabel: `${s.cropName ?? "Unknown crop"} ${s.year}`,
        fieldName: s.fieldName,
      })),
    )
    .sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""))
    .slice(0, ACTIVITY_LIMIT)
}

export interface SeasonDetail {
  _id: string
  year: number
  stage: string | null
  plantingDate: string | null
  expectedHarvest: string | null
  actualHarvest: string | null
  derivedMaturityDate: string | null
  yieldAmount: number | null
  fieldName: string | null
  cropId: string | null
  cropName: string | null
  cultivar: string | null
  gddModelKey: string | null
  growthCycleDays: number | null
  unavailableReason: string | null
  coordinates: { lat: number | null; lng: number | null } | null
  stageHistory:
    | {
        _key: string
        stage: string | null
        previousStage: string | null
        effectiveDate: string | null
        timestamp: string | null
        basis: string | null
        gddTotal: number | null
        derivedFrom: string | null
        triggeredBy: string | null
      }[]
    | null
  benchmarks: {
    _id: string
    source: string | null
    scope: string | null
    region: string | null
    unit: string | null
    sourceUrl: string | null
    licence: string | null
    observations: { year: number; value: number }[] | null
  }[]
  pests: {
    _id: string
    pest: string | null
    date: string | null
    distanceKm: number | null
    sourceUrl: string | null
    scope: string | null
  }[]
}

export function loadSeason(id: string): Promise<SeasonDetail | null> {
  return writeClient.fetch<SeasonDetail | null>(
    `*[_type == "season" && _id == $id][0]{
      _id, year, stage, plantingDate, expectedHarvest, actualHarvest, derivedMaturityDate,
      yieldAmount, stageHistory,
      "fieldName": field->name,
      "cropId": crop._ref,
      "cropName": crop->name,
      "cultivar": crop->cultivar,
      "gddModelKey": crop->gddModelKey,
      "growthCycleDays": crop->growthCycleDays,
      "unavailableReason": crop->benchmarks.unavailableReason,
      "coordinates": select(defined(field->coordinates) => field->coordinates{lat, lng}, field->farm->coordinates{lat, lng}),
      "benchmarks": *[_type == "benchmark" && crop._ref == ^.crop._ref] | order(source asc){
        _id, source, scope, region, unit, sourceUrl, licence, observations
      },
      "pests": *[_type == "pestReport" && season._ref == ^._id] | order(distanceKm asc){
        _id, pest, date, distanceKm, sourceUrl, scope
      }
    }`,
    { id },
  )
}

export interface RecommendationEntry {
  _id: string
  type: string
  status: string
  rationale: string
  createdAt: string | null
  createdBy: string | null
  reviewedAt: string | null
  reviewedBy: string | null
  decisionNote: string | null
  seasonId: string
  seasonLabel: string
  fieldName: string | null
  evidence: {
    kind: string | null
    label: string | null
    ref: string | null
    detail: string | null
  }[]
}

const RECOMMENDATION_LIMIT = 30

// Open recommendations first (proposed, approved), then decided ones, newest first within each.
export async function loadRecommendations(slug: string): Promise<RecommendationEntry[]> {
  const rows = await writeClient.fetch<RecommendationEntry[]>(
    `*[_type == "agronomyRecommendation" && field->farm->slug.current == $slug]
      | order(createdAt desc)[0...$limit]{
      _id, type, status, rationale, createdAt, createdBy, reviewedAt, reviewedBy, decisionNote,
      "seasonId": season._ref,
      "seasonLabel": season->crop->name + " " + string(season->year),
      "fieldName": field->name,
      "evidence": coalesce(evidence[]{kind, label, ref, detail}, [])
    }`,
    { slug, limit: RECOMMENDATION_LIMIT },
  )
  const open = (s: string) => (s === "proposed" || s === "approved" ? 0 : 1)
  return rows.sort((a, b) => open(a.status) - open(b.status))
}
