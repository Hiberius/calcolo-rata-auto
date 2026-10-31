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
}

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}
