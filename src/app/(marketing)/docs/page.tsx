import type { Metadata } from "next"
import { Prose } from "@/components/Prose"
import { STAGES } from "@/lib/workflow/types"

export const metadata: Metadata = { title: "Documentation" }

const ENV_VARS = [
  ["NEXT_PUBLIC_SANITY_PROJECT_ID", "Sanity project"],
  ["NEXT_PUBLIC_SANITY_DATASET", "Sanity dataset"],
  ["SANITY_API_WRITE_TOKEN", "Server-side write token"],
  ["SANITY_WEBHOOK_SECRET", "Verifies the Sanity webhook signature"],
  ["AUTH_SECRET", "Auth.js session signing"],
  ["AUTH_DEMO_USER", "Demo account username"],
  ["AUTH_DEMO_PASSWORD_HASH", "bcrypt hash of the demo password"],
  ["CRON_SECRET", "Bearer token for the scheduled reconcile (32+ characters)"],
  ["FAS_API_KEY", "USDA FAS PSD access"],
]

const ENDPOINTS = [
  ["GET | POST /api/advance", "Session or cron bearer", "Reconcile seasons against GDD"],
  ["GET /api/weather", "Session", "Forecast, archive or climate for a field"],
  ["GET | POST /api/pests", "Session", "Regional GBIF sightings for a season"],
  ["POST /api/webhook/sanity", "Signature", "Annotate high-severity pest reports"],
]

export default function Docs() {
  return (
    <Prose
      eyebrow="Documentation"
      title="Run it, read it, extend it"
      lead="The essentials for running Mecropolis locally and understanding its contracts."
    >
      <section>
        <h2>Setup</h2>
        <pre>
          <code>{`npm install
cp .env.example .env.local
node scripts/hash-password.mjs '<password>'
npm run dev`}</code>
        </pre>
        <p>
          The app serves on <code>localhost:3000</code> and the Studio on <code>/studio</code>. All
          configuration is read through one module, and the app refuses to boot when a variable is
          missing.
        </p>
      </section>

      <section>
        <h2>Environment variables</h2>
        <p>
          Names only. Set every one in <code>.env.local</code>; never commit values.
        </p>
        <table>
          <tbody>
            {ENV_VARS.map(([name, use]) => (
              <tr key={name}>
                <td>
                  <code>{name}</code>
                </td>
                <td>{use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Stage machine</h2>
        <p>Seasons move forward through six stages:</p>
        <p>
          {STAGES.map((s, i) => (
            <span key={s}>
              <code>{s}</code>
              {i < STAGES.length - 1 ? " → " : ""}
            </span>
          ))}
        </p>
        <p>
          Each hop has a guard. Planted needs a planting date and a crop; growing needs the
          emergence threshold in degree days; pre-harvest needs 90% of the maturity threshold;
          thermal maturity needs the maturity crossing; review needs a season weather snapshot and a
          resolved benchmark. GDD guards also require temperature data for at least 90% of the
          window, and a hop whose effective date is in the future is blocked.
        </p>
      </section>

      <section>
        <h2>Endpoints</h2>
        <table>
          <thead>
            <tr>
              <th>Route</th>
              <th>Auth</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            {ENDPOINTS.map(([route, auth, use]) => (
              <tr key={route}>
                <td>
                  <code>{route}</code>
                </td>
                <td>{auth}</td>
                <td>{use}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Errors return <code>{`{ error }`}</code>. <code>/api/advance</code> returns{" "}
          <code>{`{ success: false, error, reason }`}</code> and reports each season as advanced,
          unchanged, conflict or error.
        </p>
      </section>

      <section>
        <h2>Seeding</h2>
        <p>
          <code>npm run seed</code> writes the demo farm, fields, crops and seasons to the
          configured dataset and syncs regional benchmarks. It replaces the farm, fields and crops,
          so run it only against a dataset you own.
        </p>
      </section>
    </Prose>
  )
}
