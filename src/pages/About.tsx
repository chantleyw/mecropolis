import { Prose } from "@/components/Prose"
import { useTitle } from "@/lib/useTitle"

export function About() {
  useTitle("About")
  return (
    <Prose
      title="About Mecropolis"
      lead="Mecropolis is a field and crop tracker for a Western Cape farm."
    >
      <section>
        <h2>Why it exists</h2>
        <p>
          Stage fields go out of date and yields are entered from memory. Mecropolis calculates
          stage from recorded weather. Every number comes from an operator or a named public source.
        </p>
      </section>

      <section>
        <h2>Design</h2>
        <ul>
          <li>
            <strong>Stage is derived.</strong> Growing degree days accumulate from the planting date
            using the Open-Meteo archive. Each stage change stores its evidence: the date it took
            effect, the GDD total and what it was derived from.
          </li>
          <li>
            <strong>Thermal maturity.</strong> The stage after pre-harvest is labelled thermal
            maturity because no harvest event is recorded.
          </li>
          <li>
            <strong>Yield is operator-entered.</strong>
          </li>
          <li>
            <strong>Benchmarks are context.</strong> They are stored in their own documents with
            source, unit and licence.
          </li>
        </ul>
      </section>

      <section>
        <h2>Stack</h2>
        <p>
          A Vite and React 19 single-page app on Cloudflare Pages. The browser reads the public
          Sanity dataset directly with GROQ and a real-time listener. Writes and keyed data go
          through Cloudflare Pages Functions, which check a signed session cookie. Zod at the
          boundaries, Vitest for tests and Tailwind 4 for styling.
        </p>
      </section>

      <section>
        <h2>Known limitations</h2>
        <ul>
          <li>
            Crop model parameters (base temperature, thermal time to emergence and maturity) are
            hand-authored and have no citations yet.
          </li>
          <li>
            The lupin benchmark comes from HarvestStat for 2000 to 2007 only, and the seed run
            resolved no lupin benchmark documents.
          </li>
          <li>
            Pest data are GBIF occurrence records near the farm. They show where a species was
            recorded near the farm.
          </li>
          <li>
            The demo has a single shared sign-in and an in-memory rate limiter. The sign-in hides
            the dashboard pages but does not protect the data: the dataset is public-read. It does
            protect every write.
          </li>
        </ul>
      </section>
    </Prose>
  )
}
