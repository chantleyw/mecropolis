import { Prose } from "@/components/Prose"
import { useI18n } from "@/lib/i18n/store"
import { useTitle } from "@/lib/useTitle"

export function About() {
  const { t } = useI18n()
  useTitle(t("public.about.title"))
  return (
    <Prose title={t("public.about.heading")} lead={t("public.about.lead")}>
      <section>
        <h2>{t("public.about.why.title")}</h2>
        <p>{t("public.about.why.body")}</p>
      </section>

      <section>
        <h2>{t("public.about.design.title")}</h2>
        <ul>
          <li>
            <strong>{t("public.about.design.1.lead")}</strong> {t("public.about.design.1.body")}
          </li>
          <li>
            <strong>{t("public.about.design.2.lead")}</strong> {t("public.about.design.2.body")}
          </li>
          <li>
            <strong>{t("public.about.design.3.lead")}</strong>
          </li>
          <li>
            <strong>{t("public.about.design.4.lead")}</strong> {t("public.about.design.4.body")}
          </li>
        </ul>
      </section>

      <section>
        <h2>{t("public.about.stack.title")}</h2>
        <p>{t("public.about.stack.body")}</p>
      </section>

      <section>
        <h2>{t("public.about.limits.title")}</h2>
        <ul>
          <li>{t("public.about.limits.1")}</li>
          <li>{t("public.about.limits.2")}</li>
          <li>{t("public.about.limits.3")}</li>
          <li>{t("public.about.limits.4")}</li>
        </ul>
      </section>
    </Prose>
  )
}
