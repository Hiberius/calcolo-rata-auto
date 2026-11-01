# Contributing

Thanks for looking. This is a one-person project; issues and pull requests are welcome, and small is better than big.

## Setup

```bash
npm install
cp .dev.vars.example .dev.vars        # Cloudflare Turnstile test keys, local admin token
npm run db:migrate:local               # applies src/lib/db/migrations to a local D1
npm run build && npx wrangler dev --port 8799
```

Photo extraction uses Workers AI, which runs remotely even in `wrangler dev` (`"remote": true` in `wrangler.jsonc`), so it needs a Cloudflare login. Everything else works offline.

## Before you open a pull request

```bash
npm run typecheck   # tsc on the site and on scripts/
npm test            # Vitest
npm run test:e2e    # Playwright (builds and starts wrangler dev by itself)
```

CI runs typecheck, unit tests and the production build on every push.

## Ground rules

- **The arithmetic is sacred.** Anything under `src/lib/calc` changes only with a failing test first and a line in the methodology page if a formula or assumption changes. Numbers shown to users must be reproducible by hand from the inputs.
- **No personal data, ever.** The extraction prompt and validator refuse names, plates, phone numbers, tax codes. Photos are never stored. Keep it that way.
- **No lender names next to results, no advice.** The site shows numbers and declared assumptions; it does not recommend a loan, a lender or a dealer.
- **Words we do not use** on the site: *truffa*, *fregatura*, *trappola* and their relatives. A test fails if they appear.
- **Legal copy is not a playground.** Privacy, cookie, disclaimer and "who is behind this" texts change only with a reason written in the pull request.
- **Weight budgets**: the home ships about 35 kB of JavaScript gzipped and the scene island about 8 kB; a change that adds a dependency to a page needs a sentence saying why it is worth it.
- Code, comments and commit messages are in Italian (`feat:`, `fix:`, `test:`, `docs:`, `chore:` prefixes). Pull requests in English or Italian, as you prefer.

## Where things are

See [docs/architettura.md](docs/architettura.md) for the map of the codebase.
