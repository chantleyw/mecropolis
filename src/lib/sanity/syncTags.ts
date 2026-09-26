// True when a Live Content API message names any sync tag the last load depended on.
export function touchesTags(eventTags: readonly string[], loaded: ReadonlySet<string>): boolean {
  return eventTags.some((tag) => loaded.has(tag))
}
