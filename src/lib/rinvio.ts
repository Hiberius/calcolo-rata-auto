/** Indirizzi che i browser chiedono da soli, serviti con l'icona che c'è già. */
const ICONE: Readonly<Record<string, string>> = { '/favicon.ico': '/icone/favicon-32.png', '/apple-touch-icon.png': '/icone/apple-touch-icon.png' };

/**
 * Un indirizzo solo per pagina (revisione del 31/10): /guide.html e /guide rispondevano entrambi 200, e il canonical
 * portava il .html. Qui il .html va con un 301 alla versione pulita, quella della sitemap e del menu.
 */
export function rinvio(url: URL): string | null {
  const icona = ICONE[url.pathname];
  if (icona) return icona;
  if (url.pathname.startsWith('/_astro/') || !url.pathname.endsWith('.html')) return null;
  // Più barre iniziali («//evil.com/x.html») farebbero del Location l'indirizzo di un altro sito: una barra sola, sempre.
  const percorso = `/${url.pathname.replace(/^\/+/, '')}`;
  const pulito = percorso.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  return `${pulito}${url.search}`;
}
