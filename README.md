# Rata Vera — sito

Astro 5 + Cloudflare Workers (D1, KV, Workers AI, Turnstile). Specifiche: `../00_Stato/Specifica_v1_RataVera.md`, `../00_Stato/Specifica_v2_Scena_e_DueDocumenti.md`, movimento in `../00_Stato/Design_Motion_Spec.md`.

## Comandi
| Comando | Cosa fa |
|---|---|
| `npm install` | dipendenze |
| `cp .dev.vars.example .dev.vars` | segreti locali (chiavi Turnstile di test) |
| `npm run db:migrate:local` / `npm run db:migrate:remote` | applica `src/lib/db/migrations` a D1 |
| `npm run build && npx wrangler dev --port 8799` | sito in locale come in produzione (8787 su questo Mac è occupata) |
| `npm run test` | Vitest: calcolo, estrazione, promo, moduli |
| `npm run check` / `npm run typecheck` | astro check / tsc (sito e `scripts/`) |
| `npm run promo:raccogli` | raccolta promo da `scripts/promo/fonti.json` (Playwright + Workers AI + controllo aritmetico). Servono `CF_ACCOUNT_ID` e `CLOUDFLARE_API_TOKEN`. Valide in `src/data/promos`, dubbie in `../05_Promo/da-verificare` |
| `npm run test:e2e` | Playwright smoke (avvia da solo build + wrangler dev) |
| `npm run deploy` | build + `wrangler deploy` |

## Segreti (`wrangler secret put`)
`TURNSTILE_SECRET_KEY`, `HASH_SALT`, `ADMIN_TOKEN`, `BREVO_API_KEY`, `NOTIFY_EMAIL`, opzionale `ANTHROPIC_API_KEY`. Le variabili pubbliche stanno in `wrangler.jsonc` (`vars`): chiave Turnstile, mittente email, `PUBLIC_PIVA` e `PUBLIC_SEDE` (blocco «Chi c'è dietro e come guadagniamo»; vuote = "in aggiornamento").
`PUBLIC_CF_ANALYTICS_TOKEN` (Cloudflare Web Analytics) si legge a build time: `PUBLIC_CF_ANALYTICS_TOKEN=... npm run deploy`.
Il valore di `ADMIN_TOKEN` di produzione sta in `.segreti/ADMIN_TOKEN.txt` (ignorato da git). In locale: `/admin?token=admin-test`.
Finché `PUBLIC_TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY` non sono quelle vere, Turnstile usa le chiavi di test di Cloudflare (passano sempre).

## Dove sta cosa
- `src/lib/calc` funzioni pure del §4 (totale, TAEG per bisezione, scenari, tre strade, discrepanze, verdetto, formato)
- `src/lib/extract` estrazione dalla foto (schema, prompt, Workers AI, Claude opzionale, validazione). Le immagini non si salvano mai
- `src/lib/db` schema D1, migrazioni, query tipizzate
- `src/lib/og` scheda condivisibile: testo e immagine (workers-og, lasciato esterno a Vite e impacchettato da wrangler per i file .wasm)
- `src/components/decode` isola Preact della home
- `src/components/scene` la scena del risultato (v2, §2): isola Preact con canvas 2D in tre atti (dove vanno i tuoi euro, valore stimato contro debito con cursori, tre strade), vista «mostralo al venditore». In home si scarica solo quando c'è un risultato (`ScenaPigra`), nella pagina promo è `client:only`. Peso: circa 10 kB gzip propri, 21 kB con il runtime Preact condiviso
- `src/lib/calc/valore.ts` modello dichiarato del valore stimato (−20% il primo anno, −12% dopo, ±2% ogni 5.000 km, minimo 10%), debito residuo al TAN, primo mese di incrocio; `ripartizione.ts` divide il totale in prezzo, interessi, spese, polizze al centesimo; `scena.ts` dati della scena e dei cursori
- `src/lib/motion.ts` tween, curve, contatore, IntersectionObserver e prefers-reduced-motion, senza librerie
- `src/lib/og/scena.ts` + `/s/:id/scena.png` immagine statica dell'atto 2 nella scheda
- `src/lib/promo` + `src/data/promos/*.json` promozioni (§7), validate con zod a build time; pagine `/promozioni`
- `src/data/guide/*.md` le 5 guide (§3), frontmatter validato in `src/lib/guide.ts`; calcolo vivo `src/components/compare/CalcoloVivo.tsx` (senza zod)
- `src/lib/moduli` moduli pubblici (noleggio, eventi): zod `.strict()`, Turnstile, limite KV, 303 per i form HTML
- `src/lib/rimosse.ts` offerta concessionarie e verdetto esperto, tolti il 31/10/2026: `/per-concessionari`, `/verdetto`, `/api/b2b`, `/api/verdetto` rispondono 410; le tabelle D1 restano
- `src/lib/consegna.ts` `DeliveryAdapter` (v1: email Brevo, `src/lib/email.ts`)
- `src/worker.ts` ingresso del Worker: CSP con nonce (HTMLRewriter) e intestazioni di sicurezza su tutte le pagine, cron di pulizia (`src/lib/db/pulizia.ts`)
- `src/pages/index.astro` + `src/components/home` home a due documenti (v2, §1): «Che documento hai in mano?», scelta finanziamento (porta al modulo) e officina (porta a `/officina`), esempio dall'hero (`src/lib/client/esempio.ts`, anche `/?esempio=1` senza JavaScript), anteprima della scena: atto 1 calcolato sul server, atto 2 su canvas in loop (`src/lib/calc/anteprima.ts`, `src/lib/client/anteprima.ts`), ferma con prefers-reduced-motion, Save-Data, poca memoria o fotogrammi lenti
- `src/pages/officina.astro`, `/api/officina`, `src/lib/officina` officina come porta d'ingresso (§4): modello e intervento da lista chiusa, importo, provincia, email facoltativa con consenso `avviso_officina`; tabella `attese_officina`, evento `officina_attesa`, contatore pubblico solo da 25. La pulizia notturna toglie le email dopo 6 mesi
- `src/lib/indice` + `src/pages/indice` Indice Rata Vera (§3): edizione del mese dalle promo valide (in vigore, con prezzo, non noleggio), classifica unica per costo del credito, grafico ordinabile (`src/lib/client/graficoIndice.ts`), CSV `/indice/dati.csv` (CC BY 4.0, evento `indice_csv`), attesa sotto 20 promo, `/indice/metodologia`, modulo stampa `/api/stampa` → `richieste_stampa`
- `src/markets` mercati (§5): `it` attivo e indicizzato, `es`, `fr`, `de` pronti; `t(mercato, chiave)` per i testi di risultato e scena; `analizza(input, ipotesi, mercato)` e `<Scena mercato={...}>`. Non importare `src/markets/tutti.ts` nelle isole (porterebbe quattro lingue nel bundle)
- Migrazione `0005_officina_indice.sql`: tabelle `attese_officina` e `richieste_stampa`, eventi e consensi ricreati con i valori nuovi
