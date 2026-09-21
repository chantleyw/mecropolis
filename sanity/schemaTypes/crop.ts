import { defineField, defineType } from "sanity"

export const crop = defineType({
  name: "crop",
  title: "Crop",
  type: "document",
  fields: [
    defineField({ name: "name", type: "string", validation: (r) => r.required() }),
    defineField({ name: "species", type: "string" }),
    defineField({ name: "cultivar", type: "string" }),
    defineField({ name: "growthCycleDays", type: "number", validation: (r) => r.min(1) }),
    defineField({
      name: "category",
      type: "string",
      options: { list: ["grain", "oilseed", "legume", "fruit", "vegetable", "pasture", "other"] },
    }),
    defineField({
      name: "benchmarks",
      type: "object",
      description:
        "Regional benchmark sources for this crop. Set at least one source, or unavailableReason.",
      fields: [
        defineField({ name: "psdCommodityCode", type: "string", title: "USDA PSD commodity code" }),
        defineField({ name: "harvestStatProduct", type: "string", title: "HarvestStat product" }),
        defineField({ name: "worldBankIndicator", type: "string", title: "World Bank indicator" }),
        defineField({
          name: "unavailableReason",
          type: "string",
          description: "Why no benchmark source exists for this crop.",
        }),
      ],
      validation: (r) =>
        r.custom((value) => {
          const b = value as
            | {
                psdCommodityCode?: string
                harvestStatProduct?: string
                worldBankIndicator?: string
                unavailableReason?: string
              }
            | undefined
          const ok = Boolean(
            b?.psdCommodityCode ||
            b?.harvestStatProduct ||
            b?.worldBankIndicator ||
            b?.unavailableReason,
          )
          return ok ? true : "Set at least one benchmark source or an unavailableReason"
        }),
    }),
    defineField({
      name: "pestWatch",
      type: "array",
      description: "Pests to look for in regional occurrence data (GBIF).",
      of: [
        defineField({
          name: "pestWatchItem",
          type: "object",
          fields: [
            defineField({ name: "pest", type: "string", validation: (r) => r.required() }),
            defineField({ name: "gbifTaxonKey", type: "number", title: "GBIF taxon key" }),
          ],
          preview: { select: { title: "pest" } },
        }),
      ],
    }),
    defineField({ name: "notes", type: "text" }),
  ],
  preview: { select: { title: "name", subtitle: "category" } },
})
