import "server-only"
import { writeClient } from "@/lib/sanity/writeClient"

export interface FarmOverview {
  farm: { name: string; location: string | null } | null
  fields: {
    _id: string
    name: string
    hectares: number | null
    soilType: string | null
    colour: string | null
    seasons: { _id: string; year: number; stage: string | null; cropName: string | null }[]
  }[]
}

export async function loadFarmOverview(): Promise<FarmOverview> {
  const [farm, fields] = await Promise.all([
    writeClient.fetch<FarmOverview["farm"]>(`*[_type == "farm"][0]{name, location}`),
    writeClient.fetch<FarmOverview["fields"]>(
      `*[_type == "field"] | order(name asc){
        _id, name, hectares, soilType, colour,
        "seasons": *[_type == "season" && field._ref == ^._id] | order(year desc){
          _id, year, stage, "cropName": crop->name
        }
      }`,
    ),
  ])
  return { farm, fields }
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
      "growthCycleDays": crop->growthCycleDays,
      "unavailableReason": crop->benchmarks.unavailableReason,
      "coordinates": field->farm->coordinates{lat, lng},
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
