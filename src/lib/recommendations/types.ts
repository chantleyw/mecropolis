export const RECOMMENDATION_TYPES = [
  "scout_pest",
  "monitor",
  "review_benchmark",
  "review_data",
  "custom",
] as const
export type RecommendationType = (typeof RECOMMENDATION_TYPES)[number]

export const TYPE_LABEL: Record<RecommendationType, string> = {
  scout_pest: "Scout for pests",
  monitor: "Monitor",
  review_benchmark: "Review benchmark",
  review_data: "Review data",
  custom: "Custom",
}
