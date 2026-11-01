# Security policy

## Reporting a vulnerability

Please do not open a public issue for security problems.

Use GitHub's private vulnerability reporting: **Security → Report a vulnerability** on this repository. If that is not available to you, email **hiberius@gmail.com** with a description, the affected URL or file, and steps to reproduce.

You will get an answer within 72 hours. Fixes for confirmed issues ship as soon as they are ready; credit is given in the changelog unless you prefer otherwise.

## Scope

- The code in this repository and the public deployment it describes.
- Anything that lets someone read another user's data, store what the site promises never to store (quote photos, credit data), bypass the anti-bot check, escalate to `/admin`, or inject content into pages, shared cards or emails.

Out of scope: the arithmetic itself (open a normal issue if a number looks wrong), rate limits being hit by design, and third-party services (Cloudflare, Brevo, Anthropic).

## What the deployment does to protect users

- Quote photos are processed in memory and never written to storage; the extraction prompt refuses personal data.
- Every page carries a per-request Content Security Policy nonce and standard security headers (`src/worker.ts`).
- Public forms are validated with strict schemas, protected by Cloudflare Turnstile (fail-closed in production) and rate-limited in KV.
- The admin area requires a secret token set with `wrangler secret put`; the test token only works on localhost.
- Shared cards are anonymous and can be deleted by whoever holds the deletion link; a nightly job applies the retention periods stated in the privacy page.
