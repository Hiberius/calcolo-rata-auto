import type { APIRoute } from 'astro';
import { tutteLeGuide } from '~/lib/guide';
import { tutteLePromo } from '~/lib/promo';

export const prerender = true;

const STATICHE = ['/', '/promozioni', '/indice', '/indice/metodologia', '/officina', '/noleggio', '/guide', '/metodologia', '/criteri', '/chi-siamo', '/privacy', '/cookie'];

export const GET: APIRoute = ({ site }) => {
  const base = (site?.toString() ?? 'https://ratavera.it/').replace(/\/$/, '');
  const percorsi = [
    ...STATICHE.map((p) => ({ p, ultima: null as string | null })),
    ...tutteLeGuide().map((g) => ({ p: `/guide/${g.slug}`, ultima: g.aggiornato })),
    ...tutteLePromo().map((d) => ({ p: `/promozioni/${d.slugMarca}/${d.slug}`, ultima: d.promo.dataVerifica })),
  ];
  const voci = percorsi.map(({ p, ultima }) => `  <url><loc>${base}${p}</loc>${ultima ? `<lastmod>${ultima}</lastmod>` : ''}</url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${voci}\n</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
