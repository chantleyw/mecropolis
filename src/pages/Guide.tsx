import { Prose } from "@/components/Prose"
import { stageLabel } from "@/components/ui"
import type { MessageKey } from "@/lib/i18n/en"
import { useI18n } from "@/lib/i18n/store"
import { useTitle } from "@/lib/useTitle"

// One labelled item: a bold name (a translated key or a stage) and its explanation.
type Item = { label?: MessageKey; stage?: string; text: MessageKey }

interface Section {
  id: string
  title: MessageKey
  before?: MessageKey[]
  items?: Item[]
  ordered?: boolean
  after?: MessageKey[]
}

const plain = (...keys: MessageKey[]): Item[] => keys.map((text) => ({ text }))

const SECTIONS: Section[] = [
  { id: "what", title: "guide.what.title", before: ["guide.what.p1", "guide.what.p2"] },
  { id: "who", title: "guide.who.title", before: ["guide.who.p1", "guide.who.p2"] },
  {
    id: "why",
    title: "guide.why.title",
    items: plain("guide.why.1", "guide.why.2", "guide.why.3", "guide.why.4", "guide.why.5"),
  },
  {
    id: "heat",
    title: "guide.heat.title",
    before: ["guide.heat.p1", "guide.heat.p2", "guide.heat.p3", "guide.heat.p4"],
  },
  {
    id: "stages",
    title: "guide.stages.title",
    before: ["guide.stages.intro"],
    ordered: true,
    items: [
      { stage: "planning", text: "guide.stages.planning" },
      { stage: "planted", text: "guide.stages.planted" },
      { stage: "growing", text: "guide.stages.growing" },
      { stage: "pre-harvest", text: "guide.stages.preHarvest" },
      { stage: "harvested", text: "guide.stages.harvested" },
      { stage: "review", text: "guide.stages.review" },
    ],
    after: ["guide.stages.p2"],
  },
  {
    id: "start",
    title: "guide.start.title",
    ordered: true,
    items: plain(
      "guide.start.1",
      "guide.start.2",
      "guide.start.3",
      "guide.start.4",
      "guide.start.5",
    ),
  },
  { id: "home", title: "guide.home.title", before: ["guide.home.p1"] },
  {
    id: "dashboard",
    title: "guide.dashboard.title",
    before: ["guide.dashboard.intro"],
    items: [
      { label: "guide.dashboard.summary.label", text: "guide.dashboard.summary" },
      { label: "guide.dashboard.alerts.label", text: "guide.dashboard.alerts" },
      { label: "guide.dashboard.conditions.label", text: "guide.dashboard.conditions" },
      { label: "guide.dashboard.progress.label", text: "guide.dashboard.progress" },
      { label: "guide.dashboard.fields.label", text: "guide.dashboard.fields" },
      { label: "guide.dashboard.search.label", text: "guide.dashboard.search" },
      { label: "guide.dashboard.recommendations.label", text: "guide.dashboard.recommendations" },
      { label: "guide.dashboard.activity.label", text: "guide.dashboard.activity" },
    ],
  },
  {
    id: "season",
    title: "guide.season.title",
    before: ["guide.season.intro"],
    items: [
      { label: "guide.season.top.label", text: "guide.season.top" },
      { label: "guide.season.pipeline.label", text: "guide.season.pipeline" },
      { label: "guide.season.readiness.label", text: "guide.season.readiness" },
      { label: "guide.season.evidence.label", text: "guide.season.evidence" },
      { label: "guide.season.propose.label", text: "guide.season.propose" },
      { label: "guide.season.gdd.label", text: "guide.season.gdd" },
      { label: "guide.season.whatIf.label", text: "guide.season.whatIf" },
      { label: "guide.season.summary.label", text: "guide.season.summary" },
      { label: "guide.season.notes.label", text: "guide.season.notes" },
      { label: "guide.season.files.label", text: "guide.season.files" },
      { label: "guide.season.log.label", text: "guide.season.log" },
      { label: "guide.season.history.label", text: "guide.season.history" },
      { label: "guide.season.benchmark.label", text: "guide.season.benchmark" },
      { label: "guide.season.pests.label", text: "guide.season.pests" },
    ],
  },
  {
    id: "sources",
    title: "guide.sources.title",
    items: plain(
      "guide.sources.weather",
      "guide.sources.soil",
      "guide.sources.pests",
      "guide.sources.yields",
      "guide.sources.you",
    ),
  },
  {
    id: "limits",
    title: "guide.limits.title",
    items: plain(
      "guide.limits.model",
      "guide.limits.maturity",
      "guide.limits.translation",
      "guide.limits.demo",
    ),
  },
]

export function Guide() {
  const { t } = useI18n()
  useTitle(t("guide.pageTitle"))
  return (
    <Prose title={t("guide.title")} lead={t("guide.lead")}>
      <nav aria-label={t("guide.contents")}>
        <p className="eyebrow">{t("guide.contents")}</p>
        <ul>
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>{t(s.title)}</a>
            </li>
          ))}
        </ul>
      </nav>
      {SECTIONS.map((s) => {
        const List = s.ordered ? "ol" : "ul"
        return (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-20">
            <h2 id={`${s.id}-title`}>{t(s.title)}</h2>
            {s.before?.map((k) => (
              <p key={k}>{t(k)}</p>
            ))}
            {s.items && (
              <List className={s.ordered ? "mt-3 list-decimal pl-5" : undefined}>
                {s.items.map((item) => {
                  const name = item.label ? t(item.label) : item.stage && stageLabel(item.stage)
                  return (
                    <li key={item.text}>
                      {name && <strong>{name}. </strong>}
                      {t(item.text)}
                    </li>
                  )
                })}
              </List>
            )}
            {s.after?.map((k) => (
              <p key={k}>{t(k)}</p>
            ))}
          </section>
        )
      })}
    </Prose>
  )
}
