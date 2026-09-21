import type { Metadata } from "next"
import { Prose } from "@/components/Prose"

export const metadata: Metadata = { title: "About" }

export default function About() {
  return (
    <Prose
      eyebrow="About"
      title="Derived where possible, recorded where not"
      lead="Mecropolis is a field and crop tracker for a Western Cape farm."
    >
      <section>
        <h2>Why it exists</h2>
        <p>
          Farm software tends to trust whatever was typed last. A stage field goes stale, a yield
          number is entered from memory, and a regional average is set beside a single paddock as if
          the two were the same kind of thing. Mecropolis takes the opposite stance: stage is
          computed from weather that actually happened, and a number only appears when someone
          recorded it or a named public source published it.
        </p>
      </section>

      <section>
        <h2>The design stance</h2>
        <ul>
          <li>
            <strong>Stage is derived.</strong> Growing degree days accumulate from the planting date
            using the Open-Meteo archive. Each stage change stores its evidence: the date it took
            effect, the GDD total and what it was derived from.
          </li>
          <li>
            <strong>Reaching maturity is not a harvest.</strong> The stage after pre-harvest is
            labelled thermal maturity because the system has not seen a harvest happen.
          </li>
          <li>
            <strong>Yield is operator-entered.</strong> Nothing in the code writes a field&apos;s
            yield.
          </li>
          <li>
            <strong>Benchmarks are context.</strong> They live in their own documents with source,
            unit and licence, and are never expressed as a ratio or difference against a field.
          </li>
        </ul>
      </section>

      <section>
        <h2>Stack</h2>
        <p>
          Next.js 16 (App Router) and React 19 for the app, Sanity for content with an embedded
          Studio, Auth.js v5 for the demo sign-in, Zod at the boundaries, Vitest for tests and
          Tailwind 4 for styling.
        </p>
      </section>

      <section>
        <h2>Known limitations</h2>
        <ul>
          <li>
            Crop model parameters (base temperature, thermal time to emergence and maturity) are
            hand-authored and their citations are pending. They are assumptions, not validated
            values.
          </li>
          <li>
            The lupin benchmark comes from HarvestStat for 2000 to 2007 only, and the seed run
            resolved no lupin benchmark documents.
          </li>
          <li>
            Pest data are GBIF occurrence records near the farm. They say a species was recorded
            nearby, not that it is on the field.
          </li>
          <li>The demo has a single shared sign-in and an in-memory rate limiter.</li>
        </ul>
      </section>
    </Prose>
  )
}
