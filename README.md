# Rata Vera — sito

Astro 5 + Cloudflare Workers (D1, KV, Workers AI, Turnstile). Specifica: `../00_Stato/Specifica_v1_RataVera.md`.

## Comandi
| Comando | Cosa fa |
|---|---|
| `npm install` | dipendenze |
| `cp .dev.vars.example .dev.vars` | segreti locali (chiavi Turnstile di test) |
| `npm run db:migrate:local` / `npm run db:migrate:remote` | applica `src/lib/db/migrations` a D1 |
| `npm run build && npx wrangler dev --port 8799` | sito in locale come in produzione (8787 su questo Mac è occupata) |
| `npm run test` | Vitest: modulo calcolo ed estrazione |
| `npm run check` / `npm run typecheck` | astro check / tsc |
| `npm run test:e2e` | Playwright smoke (avvia da solo build + wrangler dev) |
| `npm run deploy` | build + `wrangler deploy` |

## Segreti (`wrangler secret put`)
`TURNSTILE_SECRET_KEY`, `HASH_SALT`, opzionale `ANTHROPIC_API_KEY`. Le variabili pubbliche stanno in `wrangler.jsonc` (`vars`).
Finché `PUBLIC_TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY` non sono quelle vere, Turnstile usa le chiavi di test di Cloudflare (passano sempre).

## Dove sta cosa
- `src/lib/calc` funzioni pure del §4 (totale, TAEG per bisezione, scenari, tre strade, discrepanze, verdetto, formato)
- `src/lib/extract` estrazione dalla foto (schema, prompt, Workers AI, Claude opzionale, validazione). Le immagini non si salvano mai
- `src/lib/db` schema D1, migrazioni, query tipizzate
- `src/lib/og` scheda condivisibile: testo e immagine (workers-og, lasciato esterno a Vite e impacchettato da wrangler per i file .wasm)
- `src/components/decode` isola Preact della home
