import { describe, expect, it } from "vitest"
import { pestReportDoc, toRegionalPests } from "./regional"

const field = { lat: -33.45, lng: 18.75 }

describe("toRegionalPests", () => {
  it("adds distance, sorts nearest first and drops unplaced records", () => {
    const out = toRegionalPests(
      "Diuraphis noxia",
      [
        {
          key: 1,
          eventDate: "2024-08-01T00:00:00",
          decimalLatitude: -33.9,
          decimalLongitude: 18.75,
        },
        { key: 2, eventDate: "2024-08-02", decimalLatitude: -33.5, decimalLongitude: 18.75 },
        { key: 3, decimalLatitude: -33.5, decimalLongitude: 18.75 },
        { key: 4, eventDate: "2024-08-02" },
      ],
      field,
    )
    expect(out.map((p) => p.sourceId)).toEqual(["2", "1"])
    expect(out[0]?.distanceKm).toBeGreaterThan(5)
    expect(out[0]?.distanceKm).toBeLessThan(6)
    expect(out[1]?.date).toBe("2024-08-01")
  })
})

describe("pestReportDoc", () => {
  it("is labelled regional, deterministic and carries no severity", () => {
    const p = toRegionalPests(
      "Diuraphis noxia",
      [{ key: 9, eventDate: "2024-08-02", decimalLatitude: -33.5, decimalLongitude: 18.75 }],
      field,
    )[0]
    if (!p) throw new Error("expected one sighting")
    const doc = pestReportDoc("season-a", "field-a", p)
    expect(doc).toMatchObject({
      _id: "pestReport-gbif-season-a-9",
      source: "gbif",
      scope: "regional",
      sourceUrl: "https://www.gbif.org/occurrence/9",
    })
    expect(doc).not.toHaveProperty("severity")
    expect(doc.severityBasis).toContain("not observed on the field")
  })
})
