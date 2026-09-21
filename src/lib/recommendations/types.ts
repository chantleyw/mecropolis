export const RECOMMENDATION_TYPES = [
  "scout_pest",
  "monitor",
  "review_benchmark",
  "review_data",
  "custom",
] as const
export type RecommendationType = (typeof RECOMMENDATION_TYPES)[number]
