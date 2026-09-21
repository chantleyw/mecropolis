# Roadmap

Adopted design (plan file `~/.claude/plans/pasted-content-id-60a5-production-suppl-scalable-lobster.md`, "ADOPTED DESIGN").

| Step | Scope                                                                         | Status                                                      |
| ---- | ----------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 1    | Agronomy: GDD and crop model                                                  | Done                                                        |
| 2    | Guards rewrite                                                                | Done                                                        |
| 3    | Reconciler and `/api/advance`                                                 | Done, not exercised live                                    |
| 4    | Schema: crop benchmarks, pestWatch, `benchmark` type, read-only operator docs | Done, not exercised in Studio                               |
| 5    | Benchmarks: units, PSD, HarvestStat extract, resolve, sync                    | Done (code and tests); sync not yet run against the dataset |
| 6    | Orphans: World Bank trend, GBIF regional pests, seed script                   | Done (code, tests, live probes); seed not yet run           |
| 7    | UI: stage pipeline, benchmark card, pest panel                                | Next                                                        |

Deadline 2026-10-04. Cut ladder: irrigation advisory, `/api/override`, World Bank trend, GBIF pestReport creation, `benchmark` doc type. Never cut: GDD layer, guard rewrite, effectiveDate/basis, yield-honesty controls.
