import { Fragment } from "react"

import { Prose } from "@/components/Prose"
import type { MessageKey } from "@/lib/i18n/en"
import { useI18n } from "@/lib/i18n/store"
import { useTitle } from "@/lib/useTitle"
import { STAGES } from "@/lib/workflow/types"

const ENV_VARS: [string, MessageKey][] = [
  ["VITE_SANITY_PROJECT_ID", "docs.env.projectId"],
  ["VITE_SANITY_DATASET", "docs.env.dataset"],
  ["SANITY_API_WRITE_TOKEN", "docs.env.writeToken"],
  ["SESSION_SECRET", "docs.env.sessionSecret"],
  ["DEMO_USER", "docs.env.demoUser"],
  ["DEMO_PASSWORD", "docs.env.demoPassword"],
  ["FAS_API_KEY", "docs.env.fasKey"],
]

const ENDPOINTS: [string, MessageKey, MessageKey][] = [
  ["POST /api/session/login", "docs.auth.publicLimited", "docs.ep.login"],
  ["POST /api/session/logout", "docs.auth.public", "docs.ep.logout"],
  ["GET /api/session/me", "docs.auth.public", "docs.ep.me"],
  ["POST /api/observations", "docs.auth.session", "docs.ep.observations"],
  ["POST /api/treatments", "docs.auth.session", "docs.ep.treatments"],
  ["GET /api/recommendations", "docs.auth.session", "docs.ep.recsGet"],
  ["POST /api/recommendations", "docs.auth.session", "docs.ep.recsPost"],
  ["POST /api/recommendations/:id/:action", "docs.auth.session", "docs.ep.recsAction"],
  ["POST /api/advance", "docs.auth.sessionOrBearer", "docs.ep.advance"],
  ["POST /api/scenario", "docs.auth.session", "docs.ep.scenario"],
  ["GET /api/weather?fieldId=", "docs.auth.session", "docs.ep.weather"],
  ["GET|POST /api/pests", "docs.auth.session", "docs.ep.pests"],
  ["GET /api/landing", "docs.auth.public", "docs.ep.landing"],
  ["GET /api/conditions?farm=", "docs.auth.session", "docs.ep.conditions"],
]

// A translated sentence with "{0}", "{1}" marking where each code snippet goes.
function WithCode({ text, code }: { text: string; code: string[] }) {
  return text
    .split(/\{(\d+)\}/)
    .map((part, i) => (
      <Fragment key={i}>{i % 2 === 1 ? <code>{code[Number(part)]}</code> : part}</Fragment>
    ))
}

export function Docs() {
  const { t } = useI18n()
  useTitle(t("docs.title"))
  return (
    <Prose title={t("docs.heading")} lead={t("docs.lead")}>
      <section>
        <h2>{t("docs.setup.title")}</h2>
        <pre>
          <code>{`npm install
cp .env.example .env.local
npm run dev:api
npm run dev`}</code>
        </pre>
        <p>
          <WithCode
            text={t("docs.setup.serves")}
            code={["localhost:5173", "/api", "localhost:8788"]}
          />
        </p>
      </section>

      <section>
        <h2>{t("docs.env.title")}</h2>
        <p>
          <WithCode text={t("docs.env.intro")} code={[".env.local"]} />
        </p>
        <table>
          <tbody>
            {ENV_VARS.map(([name, use]) => (
              <tr key={name}>
                <td>
                  <code>{name}</code>
                </td>
                <td>{t(use)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>{t("docs.stages.title")}</h2>
        <p>{t("docs.stages.intro")}</p>
        <p>
          {STAGES.map((s, i) => (
            <span key={s}>
              <code>{s}</code>
              {i < STAGES.length - 1 ? " → " : ""}
            </span>
          ))}
        </p>
        <p>{t("docs.stages.guards")}</p>
      </section>

      <section>
        <h2>{t("docs.endpoints.title")}</h2>
        <table>
          <thead>
            <tr>
              <th>{t("docs.endpoints.route")}</th>
              <th>{t("docs.endpoints.auth")}</th>
              <th>{t("docs.endpoints.purpose")}</th>
            </tr>
          </thead>
          <tbody>
            {ENDPOINTS.map(([route, auth, use]) => (
              <tr key={route}>
                <td>
                  <code>{route}</code>
                </td>
                <td>{t(auth)}</td>
                <td>{t(use)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          <WithCode text={t("docs.endpoints.errors")} code={["{ error }"]} />
        </p>
      </section>

      <section>
        <h2>{t("docs.seed.title")}</h2>
        <p>
          <WithCode text={t("docs.seed.body")} code={["npm run seed"]} />
        </p>
      </section>
    </Prose>
  )
}
