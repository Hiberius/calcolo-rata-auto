/// <reference types="astro/client" />

interface Env {
  readonly DB: D1Database;
  readonly KV: KVNamespace;
  readonly AI: Ai;
  readonly ASSETS: Fetcher;
  readonly PUBLIC_TURNSTILE_SITE_KEY: string;
  readonly PUBLIC_SITE_URL: string;
  readonly ESTRAZIONE_LIMITE_GIORNO: string;
  readonly ESTRAZIONE_LIMITE_MINUTO: string;
  readonly TURNSTILE_SECRET_KEY?: string;
  readonly HASH_SALT?: string;
  readonly ANTHROPIC_API_KEY?: string;
  readonly BREVO_API_KEY?: string;
  readonly NOTIFY_EMAIL?: string;
  readonly EMAIL_MITTENTE?: string;
  readonly ADMIN_TOKEN?: string;
  readonly PUBLIC_STRIPE_LINK_VERDETTO?: string;
  readonly PUBLIC_STRIPE_LINK_B2B_149?: string;
  readonly PUBLIC_STRIPE_LINK_B2B_299?: string;
}

interface ImportMetaEnv {
  /** Token di Cloudflare Web Analytics, letto a build time: se vuoto il beacon non viene caricato. */
  readonly PUBLIC_CF_ANALYTICS_TOKEN?: string;
}

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}
