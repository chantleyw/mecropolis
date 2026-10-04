// CI audit gate: runs `npm audit` and fails on every advisory except the ones listed in ALLOWED.
// Usage: node scripts/audit.mjs
// Each allowed advisory has no patched release yet. Remove it from the list once a fix ships so
// plain `npm audit` is back at 0.
import { spawnSync } from "node:child_process"

const ALLOWED = new Map([
  [
    // braces <=3.0.3, reached only through the Sanity CLI typegen (chokidar, fast-glob). No fixed
    // braces release exists yet; the user approved shipping with it open on 2026-10-04.
    "GHSA-vfj7-8cjw-p6xm",
    "braces",
  ],
])

const run = spawnSync("npm audit --json", { encoding: "utf8", shell: true })
let report
try {
  report = JSON.parse(run.stdout)
} catch {
  throw new Error(`npm audit did not return JSON (exit ${run.status}):\n${run.stderr}`)
}
if (report.error) throw new Error(`npm audit failed: ${JSON.stringify(report.error)}`)

// Advisories appear as objects in `via`; string entries only point at another vulnerable package
// whose own `via` holds the advisory, so checking the objects covers every finding.
const blocking = new Set()
const allowedSeen = new Set()
for (const vuln of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vuln.via) {
    if (typeof via === "string") continue
    const id = via.url.split("/").pop()
    if (ALLOWED.get(id) === via.name) allowedSeen.add(id)
    else blocking.add(`${via.severity} ${via.name} ${via.url}`)
  }
}

for (const id of ALLOWED.keys()) {
  if (!allowedSeen.has(id))
    process.stdout.write(`${id} no longer reported: remove it from ALLOWED\n`)
}
if (blocking.size > 0) {
  process.stderr.write(
    `npm audit found advisories outside the allowlist:\n${[...blocking].join("\n")}\n`,
  )
  process.exit(1)
}
process.stdout.write(
  `npm audit: no advisories outside the allowlist (${[...allowedSeen].join(", ") || "none"})\n`,
)
