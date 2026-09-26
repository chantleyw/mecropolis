import { defineQuery } from "groq"

import type {
  LOAD_FARM_OVERVIEW_FARM_QUERY_RESULT,
  LOAD_FARM_OVERVIEW_FIELDS_QUERY_RESULT,
  LOAD_FARMS_QUERY_RESULT,
  LOAD_RECENT_ACTIVITY_SEASONS_QUERY_RESULT,
  LOAD_RECOMMENDATIONS_QUERY_RESULT,
  LOAD_SEASON_QUERY_RESULT,
} from "../../../sanity/types"
import type { SanityClient } from "@sanity/client"

import type { RegionGrid } from "../public/regionGrid"

import { sanity } from "./client"

// Schema requires name and slug on every farm; the generated types stay nullable because
// GROQ can't express that. Narrow once here so the rest of the app sees the real guarantee.
export type FarmSummary = Omit<LOAD_FARMS_QUERY_RESULT[number], "name" | "slug"> & {
  name: string
  slug: string
}

const PHOTO = `{hotspot, crop, "asset": asset->{_id, "lqip": metadata.lqip, "dominant": metadata.palette.dominant.background}}`

const FIELD_POINT = `select(defined(coordinates) => coordinates{lat, lng}, farm->coordinates{lat, lng})`

const LOAD_FARMS_QUERY = defineQuery(`*[_type == "farm" && defined(slug.current)] | order(name asc){
  _id, name, "slug": slug.current, location,
  "coordinates": coordinates{lat, lng},
  "fieldCount": count(*[_type == "field" && farm._ref == ^._id]),
  "hectares": math::sum(*[_type == "field" && farm._ref == ^._id].hectares),
  "activeSeasons": count(*[_type == "season" && stage != "review" && field->farm._ref == ^._id])
}`)

// Loaders take their params as one object and the client last, so useLive can call them with
// the CDN client first and the uncached client after a mutation.
export async function loadFarms(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- no params; kept for useLive's signature
  _params: Record<string, never> = {},
  client: SanityClient = sanity,
): Promise<FarmSummary[]> {
  const rows = await client.fetch(LOAD_FARMS_QUERY)
  return rows.flatMap((f) => (f.name && f.slug ? [{ ...f, name: f.name, slug: f.slug }] : []))
}

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
  lastChange: { stage: string | null; effectiveDate: string | null; gddTotal: number | null } | null
}

export type OverviewField = Omit<
  LOAD_FARM_OVERVIEW_FIELDS_QUERY_RESULT[number],
  "name" | "seasons"
> & {
  name: string
  seasons: OverviewSeason[]
}

export interface FarmOverview {
  farm:
    | (Omit<NonNullable<LOAD_FARM_OVERVIEW_FARM_QUERY_RESULT>, "name" | "slug"> & {
        name: string
        slug: string
      })
    | null
  fields: OverviewField[]
}

const LOAD_FARM_OVERVIEW_FARM_QUERY = defineQuery(`*[_type == "farm" && slug.current == $slug][0]{
  name, "slug": slug.current, location, "coordinates": coordinates{lat, lng}
}`)

const LOAD_FARM_OVERVIEW_FIELDS_QUERY =
  defineQuery(`*[_type == "field" && farm->slug.current == $slug] | order(name asc){
  _id, name, hectares, soilType, colour,
  "photo": photo${PHOTO},
  "coordinates": ${FIELD_POINT},
  "ownCoordinates": defined(coordinates),
  "seasons": *[_type == "season" && field._ref == ^._id] | order(year desc){
    _id, year, stage, plantingDate, expectedHarvest,
    "cropName": crop->name,
    "gddModelKey": crop->gddModelKey,
    "growthCycleDays": crop->growthCycleDays,
    "pestCount": count(*[_type == "pestReport" && season._ref == ^._id]),
    "lastChange": stageHistory[-1]{stage, effectiveDate, gddTotal}
  }
}`)

export async function loadFarmOverview(
  { slug }: { slug: string },
  client: SanityClient = sanity,
): Promise<FarmOverview> {
  const [farmRow, fieldRows] = await Promise.all([
    client.fetch(LOAD_FARM_OVERVIEW_FARM_QUERY, { slug }),
    client.fetch(LOAD_FARM_OVERVIEW_FIELDS_QUERY, { slug }),
  ])
  const farm =
    farmRow?.name && farmRow.slug ? { ...farmRow, name: farmRow.name, slug: farmRow.slug } : null
  const fields = fieldRows.flatMap((f) =>
    f.name
      ? [
          {
            ...f,
            name: f.name,
            seasons: f.seasons.flatMap((s) => (s.year != null ? [{ ...s, year: s.year }] : [])),
          },
        ]
      : [],
  )
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

const LOAD_RECENT_ACTIVITY_SEASONS_QUERY =
  defineQuery(`*[_type == "season" && count(stageHistory) > 0 && field->farm->slug.current == $slug]{
  _id, year,
  "cropName": crop->name,
  "fieldName": field->name,
  "history": stageHistory[]{stage, previousStage, effectiveDate, timestamp, basis, triggeredBy}
}`)

// Latest stage changes across one farm's seasons, newest first.
export async function loadRecentActivity(
  { slug }: { slug: string },
  client: SanityClient = sanity,
): Promise<ActivityEntry[]> {
  const seasons: LOAD_RECENT_ACTIVITY_SEASONS_QUERY_RESULT = await client.fetch(
    LOAD_RECENT_ACTIVITY_SEASONS_QUERY,
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

// Benchmark observations have no required() validation in schema, but src/lib/benchmark/sync.ts
// always writes both fields together — narrow so the chart doesn't need to guard per point.
export type SeasonDetail = Omit<NonNullable<LOAD_SEASON_QUERY_RESULT>, "benchmarks"> & {
  benchmarks: {
    _id: string
    source: string | null
    scope: string | null
    region: string | null
    unit: string | null
    sourceUrl: string | null
    licence: string | null
    observations: { year: number; value: number }[]
  }[]
}

const LOAD_SEASON_QUERY = defineQuery(`*[_type == "season" && _id == $id][0]{
  _id, _rev, year, stage, plantingDate, expectedHarvest, actualHarvest, derivedMaturityDate,
  yieldAmount, stageHistory, "notes": notes[_type == "seasonNote"] | order(createdAt desc),
  "fieldName": field->name,
  "fieldPhoto": field->photo${PHOTO},
  "soilReport": field->soilReport.asset->{url, originalFilename, size},
  "fieldId": field._ref,
  "farmSlug": field->farm->slug.current,
  "benchmarkResolved": defined(crop->benchmarks.unavailableReason)
    || count(*[_type == "benchmark" && crop._ref == ^.crop._ref]) > 0,
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
  },
  "observations": *[_type == "observation" && season._ref == ^._id] | order(date desc)[0...20]{
    _id, date, notes
  },
  "treatments": *[_type == "treatment" && season._ref == ^._id] | order(date desc)[0...20]{
    _id, date, type, product, dosage, method, applicator, notes
  }
}`)

export async function loadSeason(
  { id }: { id: string },
  client: SanityClient = sanity,
): Promise<SeasonDetail | null> {
  const row = await client.fetch(LOAD_SEASON_QUERY, { id })
  if (!row) return null
  return {
    ...row,
    benchmarks: row.benchmarks.map((b) => ({
      ...b,
      observations: (b.observations ?? []).flatMap((o) =>
        o.year != null && o.value != null ? [{ year: o.year, value: o.value }] : [],
      ),
    })),
  }
}

// type, status and seasonId are required() in schema and always set by the recommendation write
// paths; narrow the same way as above.
export type RecommendationEntry = Omit<
  LOAD_RECOMMENDATIONS_QUERY_RESULT[number],
  "type" | "status" | "seasonId"
> & { type: string; status: string; seasonId: string }

const RECOMMENDATION_LIMIT = 30

const LOAD_RECOMMENDATIONS_QUERY =
  defineQuery(`*[_type == "agronomyRecommendation" && field->farm->slug.current == $slug]
  | order(createdAt desc)[0...$limit]{
  _id, type, status, rationale, createdAt, createdBy, reviewedAt, reviewedBy, decisionNote,
  "seasonId": season._ref,
  "seasonLabel": season->crop->name + " " + string(season->year),
  "fieldName": field->name,
  "evidence": coalesce(evidence[]{kind, label, ref, detail}, [])
}`)

// Open recommendations first (proposed, approved), then decided ones, newest first within each.
export async function loadRecommendations(
  { slug }: { slug: string },
  client: SanityClient = sanity,
): Promise<RecommendationEntry[]> {
  const rows = await client.fetch(LOAD_RECOMMENDATIONS_QUERY, { slug, limit: RECOMMENDATION_LIMIT })
  const narrowed = rows.flatMap((r) =>
    r.type && r.status && r.seasonId
      ? [{ ...r, type: r.type, status: r.status, seasonId: r.seasonId }]
      : [],
  )
  const open = (s: string) => (s === "proposed" || s === "approved" ? 0 : 1)
  return narrowed.sort((a, b) => open(a.status) - open(b.status))
}

const LOAD_REGION_GRID_QUERY = defineQuery(`*[_id == "region-grid-western-cape"][0]{
  seasonStart, throughDate, archiveUpdatedAt, forecastAt, lastAttemptAt, lastError,
  "cells": cells[]{lat, lng, land, gdd, tempMax, rain7}
}`)

/** The stored regional grid, or null before the first refresh has written it. */
export async function loadRegionGrid(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- no params; kept for useLive's signature
  _params: Record<string, never> = {},
  client: SanityClient = sanity,
): Promise<RegionGrid | null> {
  const row = await client.fetch(LOAD_REGION_GRID_QUERY)
  if (!row?.seasonStart || !row.throughDate) return null
  return {
    seasonStart: row.seasonStart,
    throughDate: row.throughDate,
    ...(row.archiveUpdatedAt ? { archiveUpdatedAt: row.archiveUpdatedAt } : {}),
    ...(row.forecastAt ? { forecastAt: row.forecastAt } : {}),
    ...(row.lastAttemptAt ? { lastAttemptAt: row.lastAttemptAt } : {}),
    ...(row.lastError ? { lastError: row.lastError } : {}),
    cells: (row.cells ?? []).flatMap((c) =>
      c.lat != null && c.lng != null && c.land != null
        ? [
            {
              lat: c.lat,
              lng: c.lng,
              land: c.land,
              ...(c.gdd != null ? { gdd: c.gdd } : {}),
              ...(c.tempMax != null ? { tempMax: c.tempMax } : {}),
              ...(c.rain7 != null ? { rain7: c.rain7 } : {}),
            },
          ]
        : [],
    ),
  }
}
