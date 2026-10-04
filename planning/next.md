# Handoff (2026-10-04)

Read first: `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`. The language picker plan (`~/.claude/plans/can-you-update-repo-cheeky-wilkinson.md`) is done. No active plan.

## State (master, pushed, deployed)

- Commits 4b4ada4 (undici override), 212abe9 (language picker, 128 locales with 665 keys each), 3a11cc3 (farmer guide and technical docs). Deployed to https://mecropolis.pages.dev on 2026-10-04.
- typecheck, lint, Prettier, 702 tests and build pass.
- Browser (local): Arabic on /guide is right-to-left with no overflow, the choice survives a reload, the Chinese login page has no console errors. Not verified: Chinese on the dashboard and season pages (needs the demo login).
- Production: checked with curl only because the browser pane blocks mecropolis.pages.dev. /guide returns 200 and the Arabic locale chunk serves Arabic text. Switching language on the live site is not verified in a browser.
- `npm audit`: 10 high, all from braces GHSA-vfj7-8cjw-p6xm via `@sanity/cli` typegen (chokidar, fast-glob). No patched braces exists yet (latest 3.0.3 is affected). The user approved deploying with it open on 2026-10-04. Add a braces override once a fix ships.

## Next

1. Override braces when a patched release exists, then confirm `npm audit` is 0.
2. Check Chinese and Arabic on the live dashboard and a season page with the demo login.

## Open threads

- Security (Low, pre-existing, 2026-10-04 review): `src/lib/dashboard/csv.ts` does not neutralise cells starting with `= + - @`, tab or CR, so an operator-entered field name like `=HYPERLINK(...)` becomes a live formula in Excel. Fix: prefix `'`. The i18n diff itself had no findings.
- Treatment trigger: verified it fires (test treatment "Trigger test" on season-ru-ridge-2026, 16:59 UTC,
  kept in the dataset). The `/api/advance` outcome is not verified: the season was unchanged, so nothing
  was written, and CLI `functions logs` shows only "invocation started". Check the Sanity dashboard log.

- Not verified in the browser: scenario negative input (pane did not take focus), RegionMap dark-mode colours.
- Review Lows left: token role note in `references/environment.md` (needs the user); no global Open-Meteo cap
  on `/api/advance`/`scenario`/`weather`; stateless logout; `migrate-notes.ts` limit=50 (one-off, skipped).
- Security (Low): treatment trigger doubles demo-driven reconciles to ~120/h; bearer callers share one
  "scheduler" limiter key (20/min per isolate). Summary: any demo user can use the shared 25/day cap.
- Security: public dataset lets anyone run `text::semanticSimilarity` and drain embeddings quota; after
  judging, disable embeddings or go private.
- `aiSummary` in schema file but `sanity schema deploy` not run.
- Summary uses stored `gddTotal` only. Search cap global (15/day); dates UTC.
- Recommendation drafts not live; `/api/history` 404s for draft-only recommendations.
- Reconcile-all: one archive fetch per season vs the 50-subrequest limit.
- Not verified in production: live refetch, PDF upload, propose/approve/reject, search, notes, zero-CSP check.
- Unhandled Sanity errors in Functions surface as platform 500. Prettier fails on 26 files. RegionMap 1.04 MB.
