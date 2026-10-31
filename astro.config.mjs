// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://ratavera.it',
  output: 'server',
  adapter: cloudflare({
    platformProxy: { enabled: true },
    imageService: 'passthrough',
  }),
  integrations: [preact()],
  vite: {
    plugins: [tailwindcss()],
    // workers-og importa file .wasm: lo lasciamo esterno e lo impacchetta wrangler al deploy.
    ssr: { external: ['workers-og', 'node:crypto'] },
    build: { rollupOptions: { external: ['workers-og'] } },
  },
});
