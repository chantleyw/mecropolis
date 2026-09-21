export interface CsvColumn<T> {
  header: string
  value: (row: T) => string | number | null
}

// RFC 4180: quote fields containing a comma, quote or line break; double embedded quotes.
const cell = (v: string | number | null): string => {
  const s = v === null ? "" : String(v)
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [columns.map((c) => cell(c.header)).join(",")]
  for (const r of rows) lines.push(columns.map((c) => cell(c.value(r))).join(","))
  return `${lines.join("\r\n")}\r\n`
}
