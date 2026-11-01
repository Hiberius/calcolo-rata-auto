# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] — 2026-11-01

First public release.

### Added
- Quote reader: photo (Workers AI, optional Claude) or manual input → total paid, cost of credit, APR (TAEG) recomputed by bisection, end-of-contract scenarios with the balloon payment.
- The scene: three animated acts on a 2D canvas (where your euros go; estimated value vs. remaining debt with sliders; the same car three ways) and a "show it to the salesperson" view.
- Anonymous shareable cards with a generated Open Graph image and a self-service deletion link.
- Official promotions decoded in the single-box format, with source and expiry; the monthly Index page and its CC BY 4.0 CSV, published only from 20 valid promotions.
- Five guides on balloon payments, APR, guaranteed future value and long-term rental, with a live calculator.
- Long-term rental request form (no purchase option), workshop quote waiting list, press notification form; all behind Cloudflare Turnstile with strict schemas and KV rate limits.
- Markets: `it` live; `es`, `fr`, `de` prepared.
- Per-request CSP nonce, security headers, nightly retention job, admin area behind a secret token.
- 217 unit tests, Playwright end-to-end suite with screenshots at four widths, CI and CodeQL workflows.
