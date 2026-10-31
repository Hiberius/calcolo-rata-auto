import { TITOLARE } from './sito';

/**
 * Chi c'è dietro e come guadagniamo: un solo testo, uguale in home, chi siamo, privacy, metodologia e modulo noleggio.
 * La verità in una riga: non siamo mediatori creditizi; sul noleggio, se si firma, possiamo ricevere un compenso dichiarato.
 */
export const TITOLO_FIDUCIA = 'Chi c’è dietro e come guadagniamo';

export const MODELLO_FIDUCIA =
  `Rata Vera è un progetto indipendente di ${TITOLARE} (P.IVA {{PIVA}}, {{SEDE}}). È gratuito. Non prendiamo compensi da banche o finanziarie e non consigliamo finanziamenti. Se chiedi un preventivo di noleggio a lungo termine e lo firmi, il noleggiatore può riconoscerci un compenso: lo diciamo prima, qui.`;

/** Finché i dati fiscali non sono nelle variabili pubbliche il testo lo dice, invece di lasciare un vuoto. */
export const IN_AGGIORNAMENTO = 'in aggiornamento';

export interface DatiTitolare {
  readonly piva: string;
  readonly sede: string;
}

type VariabiliTitolare = Partial<Record<'PUBLIC_PIVA' | 'PUBLIC_SEDE', string | undefined>>;

function pulito(v: string | undefined): string {
  return (v ?? '').trim().slice(0, 120);
}

/** P.IVA e sede dalle variabili pubbliche: prima quelle del Worker (wrangler.jsonc), poi quelle di build. */
export function datiTitolare(runtime?: VariabiliTitolare, build?: VariabiliTitolare): DatiTitolare {
  const piva = pulito(runtime?.PUBLIC_PIVA) || pulito(build?.PUBLIC_PIVA);
  const sede = pulito(runtime?.PUBLIC_SEDE) || pulito(build?.PUBLIC_SEDE);
  return { piva: piva || IN_AGGIORNAMENTO, sede: sede || `sede ${IN_AGGIORNAMENTO}` };
}

export function testoFiducia(d: DatiTitolare): string {
  return MODELLO_FIDUCIA.replace('{{PIVA}}', d.piva).replace('{{SEDE}}', d.sede);
}

/**
 * Riga di fiducia del primo schermo della home (specifica v2, §1). Formulazione scelta col test del 31/10 notte su 6 sconosciuti
 * per versione: «chi ci paga» capito da 4 su 6, contro 2 su 6 della versione «paga il noleggiatore, non tu» e 0 su 6 di quella
 * che rimandava il modello a un link «Come guadagniamo». Ordine: cosa siamo e cosa no, gratis e nessuna offerta proposta,
 * l'unico caso in cui guadagniamo. P.IVA e sede compaiono appena sono nelle variabili pubbliche; finché mancano la frase
 * non lo dice («P.IVA e sede in pubblicazione» confondeva). Mai «noleggiatore» qui.
 */
export function rigaFiducia(d: DatiTitolare): { readonly dietro: string; readonly paga: string } {
  const mancano = d.piva === IN_AGGIORNAMENTO || d.sede === `sede ${IN_AGGIORNAMENTO}`;
  const dati = mancano ? '' : ` (P.IVA ${d.piva}, ${d.sede})`;
  return {
    dietro: `Chi c’è dietro: ${TITOLARE}${dati}, una persona, non un concessionario né una banca.`,
    paga: 'Per te è gratis e non ti proponiamo offerte: vedi solo i tuoi numeri. Guadagniamo in un caso solo: se sei tu a chiedere un’offerta di noleggio, la commissione la paga la società di noleggio, non tu.',
  };
}
