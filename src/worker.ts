import { handle } from '@astrojs/cloudflare/handler';
import type { SSRManifest } from 'astro';
import { App } from 'astro/app';
import { pulisci } from './lib/db/pulizia';
import { applicaSicurezza, senzaCondizionali } from './lib/sicurezza';

type Handle = typeof handle;

/**
 * Ingresso del Worker: lo stesso handler di @astrojs/cloudflare, più intestazioni di sicurezza e CSP con nonce
 * su ogni pagina, anche su quelle prerenderizzate (run_worker_first in wrangler.jsonc), e la pulizia notturna.
 */
export function createExports(manifest: SSRManifest) {
  const app = new App(manifest);
  return {
    default: {
      async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const risposta = await handle(manifest, app, senzaCondizionali(request) as unknown as Parameters<Handle>[2], env as unknown as Parameters<Handle>[3], ctx as Parameters<Handle>[4]);
        return applicaSicurezza(risposta);
      },
      async scheduled(_evento: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
        ctx.waitUntil(pulisci(env.DB).catch((e: unknown) => console.error('[pulizia] non riuscita', e instanceof Error ? e.message : e)));
      },
    } satisfies ExportedHandler<Env>,
  };
}
