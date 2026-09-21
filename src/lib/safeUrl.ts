// Returns the URL only when it parses and uses http or https, so a stored `javascript:` or `data:`
// value is never rendered as a link.
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null
  } catch {
    return null
  }
}
