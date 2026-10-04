import { common } from "./catalog/common"
import { dashboard } from "./catalog/dashboard"
import { docs } from "./catalog/docs"
import { guide } from "./catalog/guide"
import { publicPages } from "./catalog/public"
import { season } from "./catalog/season"

// The English source catalog. Every UI string lives in one of the catalog files; the translation
// script reads this object and writes one JSON file per language into ./locales.
export const en = {
  ...common,
  ...publicPages,
  ...docs,
  ...guide,
  ...dashboard,
  ...season,
} as const

export type MessageKey = keyof typeof en
