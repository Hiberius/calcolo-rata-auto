/**
 * Chi c'è dietro e come guadagniamo: un solo testo, uguale in chi siamo, privacy, metodologia e modulo noleggio.
 * La verità in una riga: non siamo mediatori creditizi; sul noleggio, se si firma, possiamo ricevere un compenso dichiarato.
 * Nome del titolare, P.IVA e sede arrivano dalle variabili pubbliche (wrangler.jsonc): il codice non contiene dati di
 * persone e un fork parte pulito. Il nome non compare mai in home (richiesta del 31/10 notte): solo nelle pagine legali.
 */
export const TITOLO_FIDUCIA = 'Chi c’è dietro e come guadagniamo';

/** Finché i dati fiscali non sono nelle variabili pubbliche il testo lo dice, invece di lasciare un vuoto. */
export const IN_AGGIORNAMENTO = 'in aggiornamento';

export interface DatiTitolare {
  /** Vuoto se non configurato: il testo allora non nomina nessuno. */
  readonly nome: string;
  readonly piva: string;
  readonly sede: string;
}

type VariabiliTitolare = Partial<Record<'PUBLIC_TITOLARE' | 'PUBLIC_PIVA' | 'PUBLIC_SEDE', string | undefined>>;

function pulito(v: string | undefined): string {
  return (v ?? '').trim().slice(0, 120);
}

/** Nome, P.IVA e sede dalle variabili pubbliche: prima quelle del Worker (wrangler.jsonc), poi quelle di build. */
export function datiTitolare(runtime?: VariabiliTitolare, build?: VariabiliTitolare): DatiTitolare {
  const scegli = (chiave: keyof VariabiliTitolare): string => pulito(runtime?.[chiave]) || pulito(build?.[chiave]);
  const piva = scegli('PUBLIC_PIVA');
  const sede = scegli('PUBLIC_SEDE');
  return { nome: scegli('PUBLIC_TITOLARE'), piva: piva || IN_AGGIORNAMENTO, sede: sede || `sede ${IN_AGGIORNAMENTO}` };
}

export function testoFiducia(d: DatiTitolare): string {
  const di = d.nome ? ` di ${d.nome}` : '';
  return `Rata Vera è un progetto indipendente${di} (P.IVA ${d.piva}, ${d.sede}). È gratuito. Non prendiamo compensi da banche o finanziarie e non consigliamo finanziamenti. Se chiedi un preventivo di noleggio a lungo termine e lo firmi, il noleggiatore può riconoscerci un compenso: lo diciamo prima, qui.`;
}
