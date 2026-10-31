import { FORME_NEL_TESTO, GLOSSARIO, idTermine, type VoceGlossario } from './glossario';

/** Il minimo dell'albero HTML (hast) che serve qui, senza dipendenze. */
interface Testo { readonly type: 'text'; readonly value: string }
interface Elemento { readonly type: 'element'; readonly tagName: string; readonly properties: Record<string, unknown>; children: Nodo[] }
interface Altro { readonly type: string; children?: Nodo[] }
type Nodo = Testo | Elemento | Altro;

/** Dove non si inserisce un pulsante: titoli, link, codice, tabelle (scorrono in orizzontale e taglierebbero la definizione). */
const SALTA = new Set(['a', 'button', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'script', 'style']);
const AMBITO = 'guida';

function el(tagName: string, properties: Record<string, unknown>, children: Nodo[]): Elemento {
  return { type: 'element', tagName, properties, children };
}
function testo(value: string): Testo {
  return { type: 'text', value };
}

/** Stessa struttura di components/ui/Termine.tsx, così stile e comportamento sono identici. */
function nodoTermine(voce: VoceGlossario, parola: string): Elemento {
  const id = idTermine(AMBITO, voce);
  return el('span', { className: ['termine'], dataTermine: '' }, [
    el('button', { type: 'button', className: ['termine-voce'], ariaExpanded: 'false', ariaDescribedBy: id, dataTermineVoce: '' }, [testo(parola)]),
    el('span', { role: 'tooltip', id, className: ['termine-def'] }, [
      el('span', { className: ['sr-only'] }, [testo(' (')]),
      testo(GLOSSARIO[voce].definizione),
      el('span', { className: ['sr-only'] }, [testo(')')]),
    ]),
  ]);
}

/** Divide un testo alla prima voce non ancora spiegata nella pagina; ripete sul resto. */
function dividi(valore: string, visti: Set<VoceGlossario>): Nodo[] {
  const trovati = FORME_NEL_TESTO.filter(([v]) => !visti.has(v))
    .map(([v, re]) => ({ v, m: re.exec(valore) }))
    .filter((x): x is { v: VoceGlossario; m: RegExpExecArray } => x.m !== null)
    .sort((a, b) => a.m.index - b.m.index);
  const primo = trovati[0];
  if (!primo) return [testo(valore)];
  visti.add(primo.v);
  const { index } = primo.m;
  const parola = primo.m[0];
  return [
    ...(index > 0 ? [testo(valore.slice(0, index))] : []),
    nodoTermine(primo.v, parola),
    ...dividi(valore.slice(index + parola.length), visti),
  ].filter((n) => n.type !== 'text' || (n as Testo).value !== '');
}

function visita(nodo: Nodo, visti: Set<VoceGlossario>): void {
  if (nodo.type === 'text') return;
  const contenitore = nodo as Altro;
  if (!contenitore.children || (nodo.type === 'element' && SALTA.has((nodo as Elemento).tagName))) return;
  contenitore.children = contenitore.children.flatMap((figlio: Nodo) => {
    if (figlio.type === 'text') return dividi((figlio as Testo).value, visti);
    visita(figlio, visti);
    return [figlio];
  });
}

/** Plugin rehype per le guide: la prima volta che compare ogni voce del glossario diventa spiegabile al tocco. */
export function rehypeGlossario() {
  return (albero: Nodo): void => visita(albero, new Set());
}
