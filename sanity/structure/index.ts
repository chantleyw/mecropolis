import { ArchiveIcon } from "@sanity/icons/Archive"
import { CalendarIcon } from "@sanity/icons/Calendar"
import { CheckmarkCircleIcon } from "@sanity/icons/CheckmarkCircle"
import { PinIcon } from "@sanity/icons/Pin"
import { WarningFilledIcon } from "@sanity/icons/WarningFilled"
import type { StructureResolver } from "sanity/structure"

import { STAGES } from "@/lib/workflow/types"

export const structure: StructureResolver = (S) =>
  S.list().id("root").title("Mecropolis").items([
    S.listItem().id("review").title("Needs review").icon(CheckmarkCircleIcon).child(
      S.documentTypeList("agronomyRecommendation")
        .title("Proposed recommendations")
        .filter('_type == "agronomyRecommendation" && status == "proposed"')
        .defaultOrdering([{ field: "createdAt", direction: "desc" }]),
    ),
    S.listItem().id("pests").title("Pest alerts").icon(WarningFilledIcon).child(
      S.documentTypeList("pestReport")
        .title("High and critical")
        .filter('_type == "pestReport" && severity in ["high","critical"] && resolved != true')
        .defaultOrdering([{ field: "distanceKm", direction: "asc" }]),
    ),
    S.listItem().id("seasons").title("Active seasons").icon(CalendarIcon).child(
      S.list().title("By stage").items(
        STAGES.map((stage) =>
          S.listItem().id(stage).title(stage).child(
            S.documentTypeList("season")
              .title(`Stage: ${stage}`)
              .filter('_type == "season" && stage == $stage')
              .params({ stage })
              .defaultOrdering([{ field: "year", direction: "desc" }]),
          ),
        ),
      ),
    ),
    S.divider(),
    S.listItem().id("farms").title("Farms").icon(PinIcon).child(
      S.documentTypeList("farm").child((farmId) =>
        S.documentTypeList("field")
          .title("Fields")
          .filter('_type == "field" && farm._ref == $farmId')
          .params({ farmId })
          .child((fieldId) =>
            S.list().title("Field").items([
              S.listItem().id("edit").title("Edit field")
                .child(S.document().documentId(fieldId).schemaType("field")),
              S.listItem().id("seasons").title("Seasons").child(
                S.documentTypeList("season")
                  .title("Seasons")
                  .filter('_type == "season" && field._ref == $fieldId')
                  .params({ fieldId }),
              ),
            ]),
          ),
      ),
    ),
    S.divider(),
    S.listItem().id("reference").title("Reference data").icon(ArchiveIcon).child(
      S.list().title("Reference data").items([
        S.documentTypeListItem("benchmark").title("Yield benchmarks"),
        S.documentTypeListItem("weatherSnapshot").title("Weather snapshots"),
        S.documentTypeListItem("crop").title("Crops"),
        S.documentTypeListItem("observation").title("Observations (unused)"),
        S.documentTypeListItem("treatment").title("Treatments (unused)"),
      ]),
    ),
  ])
