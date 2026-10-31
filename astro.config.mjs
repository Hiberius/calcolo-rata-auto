// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://ratavera.it',
  build: { format: 'file' },
  output: 'server',
  adapter: cloudflare({
    platformProxy: { enabled: true },
    imageService: 'passthrough',
  }),
  integrations: [preact()],
  vite: {
    // Il plugin Tailwind porta i tipi di una vite più recente di quella di Astro 5: il cast evita il falso errore di tipo.
    plugins: [/** @type {any} */ (tailwindcss())],
    // workers-og importa file .wasm: lo lasciamo esterno e lo impacchetta wrangler al deploy.
    ssr: { external: ['workers-og', 'node:crypto'] },
    build: { rollupOptions: { external: ['workers-og'] } },
  },
});
