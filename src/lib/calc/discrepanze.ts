import { QUOTA_MAX_SPESE_IMPLICITE, TOLLERANZA_EURO } from './config';
import { arrotonda, euro } from './format';
import type { Discrepanza, Preventivo, Ricostruzione } from './tipi';
import { prezzoDiRiferimento, sommaRate, speseRicorrenti } from './totale';

interface Candidato {
  readonly valore: number;
  readonly istruttoria: boolean;
  readonly bollo: boolean;
}

function candidatiCredito(base: number, p: Preventivo): Candidato[] {
  const lista: Candidato[] = [{ valore: base, istruttoria: false, bollo: false }];
  if (p.speseIstruttoria != null) {
    lista.push({ valore: base + p.speseIstruttoria, istruttoria: true, bollo: false });
    if (p.impostaBollo != null) {
      lista.push({ valore: base + p.speseIstruttoria + p.impostaBollo, istruttoria: true, bollo: true });
    }
  }
  return lista;
}

function messaggioDiscrepanza(cosa: string, differenza: number): string {
  return `${cosa} non torna di ${euro(Math.abs(differenza))}: chiedi al venditore da dove viene la differenza.`;
}

function discrepanza(campo: Discrepanza['campo'], etichetta: string, dichiarato: number, ricostruito: number): Discrepanza {
  const differenza = arrotonda(dichiarato - ricostruito);
  return { campo, etichetta, dichiarato, ricostruito: arrotonda(ricostruito), differenza, messaggio: messaggioDiscrepanza(etichetta, differenza) };
}

interface EsitoCredito {
  readonly valore: number | null;
  readonly istruttoria: boolean;
  readonly bollo: boolean;
  readonly discrepanza: Discrepanza | null;
}

function ricostruisciCredito(p: Preventivo): EsitoCredito {
  const prezzo = prezzoDiRiferimento(p).valore;
  if (p.tipo === 'noleggio' || prezzo == null) {
    return { valore: p.importoCreditoDichiarato ?? null, istruttoria: false, bollo: false, discrepanza: null };
  }
  const candidati = candidatiCredito(Math.max(0, prezzo - p.anticipo), p);
  const dichiarato = p.importoCreditoDichiarato;
  const primo = candidati[0] as Candidato;
  if (dichiarato == null) return { valore: arrotonda(primo.valore), istruttoria: false, bollo: false, discrepanza: null };
  const coincide = candidati.find((c) => Math.abs(c.valore - dichiarato) <= TOLLERANZA_EURO);
  if (coincide) return { valore: arrotonda(coincide.valore), istruttoria: coincide.istruttoria, bollo: coincide.bollo, discrepanza: null };
  const vicino = candidati.reduce((a, c) => (Math.abs(c.valore - dichiarato) < Math.abs(a.valore - dichiarato) ? c : a), primo);
  return {
    valore: arrotonda(vicino.valore),
    istruttoria: false,
    bollo: false,
    discrepanza: discrepanza('importoCredito', "L'importo del credito", dichiarato, vicino.valore),
  };
}

function haSpeseDettagliate(p: Preventivo): boolean {
  return p.speseIstruttoria != null || p.impostaBollo != null || p.speseIncassoRata != null;
}

/**
 * Ricostruisce credito e totale dovuto dai numeri visibili e li confronta con i dichiarati.
 * Se il totale dichiarato supera di poco la somma delle rate e il preventivo non dettaglia spese,
 * la differenza è trattata come spese non dettagliate (non come discrepanza).
 */
export function ricostruisci(p: Preventivo): Ricostruzione {
  const credito = ricostruisciCredito(p);
  const bollo = credito.bollo ? 0 : (p.impostaBollo ?? 0);
  const totaleRicostruito = arrotonda(sommaRate(p) + (p.maxiRata ?? 0) + speseRicorrenti(p) + bollo);
  const discrepanze: Discrepanza[] = credito.discrepanza ? [credito.discrepanza] : [];
  let speseImplicite = 0;
  const dichiarato = p.importoTotaleDovutoDichiarato;
  if (dichiarato != null && p.tipo !== 'noleggio') {
    const diff = arrotonda(dichiarato - totaleRicostruito);
    const implicite = diff > TOLLERANZA_EURO && !haSpeseDettagliate(p) && diff <= dichiarato * QUOTA_MAX_SPESE_IMPLICITE;
    if (implicite) speseImplicite = diff;
    else if (Math.abs(diff) > TOLLERANZA_EURO) {
      discrepanze.push(discrepanza('importoTotaleDovuto', "L'importo totale dovuto", dichiarato, totaleRicostruito));
    }
  }
  return {
    importoCreditoRicostruito: credito.valore,
    istruttoriaFinanziata: credito.istruttoria,
    bolloNelCredito: credito.bollo,
    importoTotaleDovutoRicostruito: totaleRicostruito,
    speseImplicite,
    discrepanze,
  };
}
