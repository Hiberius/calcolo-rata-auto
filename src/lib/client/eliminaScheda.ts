import { dimenticaTokenCancellazione, leggiTokenCancellazione, linkCancellazione, salvaTokenCancellazione, tokenDalFrammento } from './cancellazione';

const TESTI = {
  conferma: 'Sì, elimina per sempre',
  elimina: 'Elimina questa scheda',
  avviso: 'La scheda sparirà anche per chi ha già il link. Non si può annullare.',
  copiato: 'Link copiato. Conservalo dove conservi le cose private.',
  copiaManuale: 'Seleziona il link e copialo a mano.',
  rete: 'Connessione assente o lenta: riprova tra poco.',
  inCorso: 'Elimino la scheda…',
} as const;

function montaBlocco(doc: Document, radice: HTMLElement): HTMLElement | null {
  const modello = doc.querySelector<HTMLTemplateElement>('template[data-elimina-modello]');
  const blocco = modello?.content.firstElementChild?.cloneNode(true);
  if (!(blocco instanceof HTMLElement)) return null;
  radice.appendChild(blocco);
  return blocco;
}

async function chiediCancellazione(id: string, token: string): Promise<{ ok: boolean; errore?: string }> {
  const r = await fetch(`/api/scheda/${id}`, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) });
  return (await r.json()) as { ok: boolean; errore?: string };
}

/** Pulsante «Elimina questa scheda» su /s/[id], solo per chi ha il codice (creazione nello stesso browser o link). */
export function avviaEliminaScheda(doc: Document, posizione: Location, cronologia: History): void {
  const radice = doc.querySelector<HTMLElement>('[data-elimina]');
  const id = radice?.dataset['id'];
  if (!radice || !id) return;
  const daLink = tokenDalFrammento(posizione.hash);
  if (daLink) {
    salvaTokenCancellazione(id, daLink);
    // Il codice esce subito dalla barra degli indirizzi: così non finisce in una condivisione per sbaglio.
    cronologia.replaceState(null, '', `${posizione.pathname}${posizione.search}`);
  }
  const token = daLink ?? leggiTokenCancellazione(id);
  const blocco = token ? montaBlocco(doc, radice) : null;
  if (!token || !blocco) return;

  const link = linkCancellazione(posizione.origin, id, token);
  const campo = blocco.querySelector<HTMLInputElement>('[data-link-elimina]');
  const elimina = blocco.querySelector<HTMLButtonElement>('[data-elimina-scheda]');
  const annulla = blocco.querySelector<HTMLButtonElement>('[data-annulla-elimina]');
  const esito = blocco.querySelector<HTMLElement>('[data-esito-elimina]');
  const dire = (testo: string) => { if (esito) esito.textContent = testo; };
  if (campo) campo.value = link;
  let daConfermare = false;
  const ripristina = () => {
    daConfermare = false;
    if (elimina) elimina.textContent = TESTI.elimina;
    if (annulla) annulla.hidden = true;
    dire('');
  };

  blocco.querySelector('[data-copia-link-elimina]')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(link);
      dire(TESTI.copiato);
    } catch {
      campo?.select();
      dire(TESTI.copiaManuale);
    }
  });
  annulla?.addEventListener('click', ripristina);
  elimina?.addEventListener('click', async () => {
    if (!daConfermare) {
      daConfermare = true;
      elimina.textContent = TESTI.conferma;
      if (annulla) annulla.hidden = false;
      dire(TESTI.avviso);
      return;
    }
    elimina.disabled = true;
    dire(TESTI.inCorso);
    try {
      const risposta = await chiediCancellazione(id, token);
      if (risposta.ok) {
        dimenticaTokenCancellazione(id);
        posizione.replace(`/s/${id}?eliminata=1`);
        return;
      }
      dire(risposta.errore ?? TESTI.rete);
    } catch {
      dire(TESTI.rete);
    }
    elimina.disabled = false;
  });
}
