import { defineArrayMember, defineField, defineType } from "sanity"

// One document per region, written only by functions/api/region.ts. Degree days accumulate
// incrementally from the Open-Meteo archive so each refresh fetches at most 14 new days.
export const regionGrid = defineType({
  name: "regionGrid",
  title: "Region grid",
  type: "document",
  fields: [
    defineField({ name: "seasonStart", type: "date", validation: (r) => r.required() }),
    defineField({
      name: "throughDate",
      type: "date",
      description: "Last day included in every cell's degree days.",
      validation: (r) => r.required(),
    }),
    defineField({ name: "archiveUpdatedAt", type: "datetime" }),
    defineField({ name: "forecastAt", type: "datetime" }),
    defineField({ name: "lastAttemptAt", type: "datetime" }),
    defineField({
      name: "lastError",
      type: "string",
      description: "Reason the most recent refresh failed; cleared on success.",
    }),
    defineField({
      name: "cells",
      type: "array",
      validation: (r) => r.required(),
      of: [
        defineArrayMember({
          type: "object",
          name: "regionCell",
          fields: [
            defineField({ name: "lat", type: "number", validation: (r) => r.required() }),
            defineField({ name: "lng", type: "number", validation: (r) => r.required() }),
            defineField({ name: "land", type: "boolean", validation: (r) => r.required() }),
            defineField({ name: "gdd", type: "number" }),
            defineField({ name: "tempMax", type: "number" }),
            defineField({ name: "rain7", type: "number" }),
          ],
        }),
      ],
    }),
  ],
})
