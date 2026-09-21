# Environment

## Variables (`.env.local`, template in `.env.example`, validated in `src/lib/env.ts`)

| Name                                                          | Purpose                                                                          |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET` | Sanity project (client code reads via `src/lib/publicEnv.ts`)                    |
| `SANITY_API_WRITE_TOKEN`                                      | Write token; only imported in `src/lib/sanity/writeClient.ts` (`server-only`)    |
| `SANITY_WEBHOOK_SECRET`                                       | Verifies `/api/webhook/sanity` signatures                                        |
| `AUTH_SECRET`, `AUTH_DEMO_USER`, `AUTH_DEMO_PASSWORD_HASH`    | Auth.js; hash with `node scripts/hash-password.mjs '<pw>'` (escapes `$` as `\$`) |
| `CRON_SECRET`                                                 | 32+ chars; Bearer token for `/api/advance`                                       |
| `FAS_API_KEY`                                                 | USDA PSD                                                                         |

Never commit or log these values.

## Sanity typegen

```bash
set -a; . ./.env.local; set +a; rm -f sanity/extract.json; npm run typegen
```

The CLI ignores `.env.local`, and extract fails if `sanity/extract.json` exists.

## Notes

- Windows: Git Bash; a running `.exe` locks files.
- `next start` locally needs `AUTH_TRUST_HOST=true`.
- npm 11: `create-next-app` install fails on `--allow-scripts`; install manually. Vitest 5 needs `@types/node` 24.
- `package.json` `overrides` pin adm-zip, js-yaml, smol-toml, uuid to keep `npm audit` at 0.
- `format:check` currently flags `sanity/schemaTypes/weatherSnapshot.ts` and `.claude/settings.local.json` (pre-existing).
