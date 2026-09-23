import { Prose } from "@/components/Prose"
import { useTitle } from "@/lib/useTitle"
import { STAGES } from "@/lib/workflow/types"

const ENV_VARS = [
  ["VITE_SANITY_PROJECT_ID", "Sanity project, read by the browser"],
  ["VITE_SANITY_DATASET", "Sanity dataset, read by the browser"],
  ["SANITY_API_WRITE_TOKEN", "Write token, Functions only"],
  ["SESSION_SECRET", "Signs the session cookie (32+ characters)"],
  ["DEMO_USER", "Demo account username"],
  ["DEMO_PASSWORD", "Demo account password"],
  ["FAS_API_KEY", "USDA FAS PSD access, Functions only"],
]

const ENDPOINTS = [
  ["POST /api/session/login", "Public, rate limited", "Sign in; sets an HttpOnly session cookie"],
  ["POST /api/session/logout", "Public", "Clear the session cookie"],
  ["GET /api/session/me", "Public", "Who is signed in"],
  ["POST /api/observations", "Session", "Log a field observation"],
  ["POST /api/treatments", "Session", "Log a treatment for a season"],
  ["POST /api/recommendations", "Session", "Propose a recommendation for a season"],
  [
    "POST /api/recommendations/:id/:action",
    "Session",
    "Approve, reject or complete a recommendation",
  ],
  ["POST /api/advance", "Session or bearer", "Walk season stages forward from GDD"],
  ["POST /api/scenario", "Session", "What-if GDD calculation; nothing is saved"],
  ["GET /api/weather?fieldId=", "Session", "Forecast, archive or projection for a field"],
  ["GET|POST /api/pests", "Session", "Regional GBIF sightings; POST stores them"],
  ["GET /api/landing", "Public", "Weather, soil, pests and yields for the demo site"],
  ["GET /api/conditions?farm=", "Session", "Weather, soil and pests for one farm"],
]

export function Docs() {
  useTitle("Documentation")
  return (
    <Prose title="Setup and API" lead="How to run Mecropolis locally and what its endpoints do.">
      <section>
        <h2>Setup</h2>
        <pre>
          <code>{`npm install
cp .env.example .env.local
npm run dev:api
npm run dev`}</code>
        </pre>
        <p>
          The app serves on <code>localhost:5173</code> and proxies <code>/api</code> to the Pages
          Functions on <code>localhost:8788</code>. Browser configuration is read through one module
          and Functions validate theirs; neither starts when a variable is missing.
        </p>
      </section>

      <section>
        <h2>Environment variables</h2>
        <p>
          Names only. Set each one in <code>.env.local</code>.
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
          Errors return <code>{`{ error }`}</code>. Writes also require a same-origin request.
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
