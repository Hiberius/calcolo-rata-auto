// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';
import { rehypeGlossario } from './src/lib/glossarioRehype.ts';

export default defineConfig({
  site: 'https://ratavera.it',
  build: { format: 'file' },
  output: 'server',
  adapter: cloudflare({
    platformProxy: { enabled: true },
    imageService: 'passthrough',
    workerEntryPoint: { path: 'src/worker.ts' },
  }),
  integrations: [preact()],
  // Glossario in linea nelle guide: prima occorrenza di TAN, TAEG, maxi rata, valore futuro garantito, SECCI, importo totale dovuto.
  markdown: { rehypePlugins: [rehypeGlossario] },
  vite: {
    // Il plugin Tailwind porta i tipi di una vite più recente di quella di Astro 5: il cast evita il falso errore di tipo.
    plugins: [/** @type {any} */ (tailwindcss())],
    // workers-og importa file .wasm: lo lasciamo esterno e lo impacchetta wrangler al deploy.
    ssr: { external: ['workers-og', 'node:crypto'] },
    build: { rollupOptions: { external: ['workers-og'] } },
  },
});
