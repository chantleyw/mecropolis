export interface CsvColumn<T> {
  header: string
  value: (row: T) => string | number | null
}

// RFC 4180: quote fields containing a comma, quote or line break; double embedded quotes.
// Text that starts with = + - @ tab or CR gets a leading ' so Excel and Sheets show it as text
// instead of running it as a formula (field names are operator-entered and the demo login is
// public). Numbers are left alone so negative values stay numeric.
const cell = (v: string | number | null): string => {
  const raw = v === null ? "" : String(v)
  const s = typeof v === "string" && /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [columns.map((c) => cell(c.header)).join(",")]
  for (const r of rows) lines.push(columns.map((c) => cell(c.value(r))).join(","))
  return `${lines.join("\r\n")}\r\n`
}
