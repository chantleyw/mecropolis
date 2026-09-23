# Environment

## Variables (`.env.local`, template in `.env.example`)

| Name                                            | Purpose                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| `VITE_SANITY_PROJECT_ID`, `VITE_SANITY_DATASET` | Sanity project; browser reads via `src/lib/publicEnv.ts`, CLI via `sanity/project.ts` |
| `SESSION_SECRET`, `DEMO_USER`, `DEMO_PASSWORD`  | Pages Functions session cookie and the published demo login (`functions/_lib/env.ts`) |
| `SANITY_API_WRITE_TOKEN`                        | Write token; Pages Functions secret and `npm run seed` only                           |
| `SANITY_WEBHOOK_SECRET`                         | Verifies `/api/webhook/sanity` signatures                                             |
| `CRON_SECRET`                                   | 32+ chars; Bearer token for `/api/advance` (Function returns in Milestone 4)          |
| `FAS_API_KEY`                                   | USDA PSD                                                                              |

Never commit or log these values.

## Sanity typegen

```bash
set -a; . ./.env.local; set +a; rm -f sanity/extract.json; npm run typegen
```

The CLI ignores `.env.local`, and extract fails if `sanity/extract.json` exists.

## Notes

- Windows: Git Bash; a running `.exe` locks files.
- npm 11: `create-next-app` install fails on `--allow-scripts`; install manually. Vitest 5 needs `@types/node` 24.
- `package.json` `overrides` pin adm-zip, js-yaml, smol-toml, uuid to keep `npm audit` at 0.
- `format:check` currently flags `sanity/schemaTypes/weatherSnapshot.ts` and `.claude/settings.local.json` (pre-existing).
