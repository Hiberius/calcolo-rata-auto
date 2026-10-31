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
 * Riga di fiducia del primo schermo della home (specifica v2, §1): due frasi, chi c'è dietro e chi ci paga.
 * Finché P.IVA e sede non sono nelle variabili pubbliche la frase lo dice: «P.IVA e sede in pubblicazione».
 */
export function rigaFiducia(d: DatiTitolare): { readonly dietro: string; readonly paga: string } {
  const mancano = d.piva === IN_AGGIORNAMENTO || d.sede === `sede ${IN_AGGIORNAMENTO}`;
  const dati = mancano ? 'P.IVA e sede in pubblicazione' : `P.IVA ${d.piva}, ${d.sede}`;
  return {
    dietro: `Chi c’è dietro: ${TITOLARE}, ${dati}.`,
    paga: 'Chi ci paga: nessuna banca o finanziaria. Guadagniamo solo se chiedi un’offerta di noleggio e la firmi: paga il noleggiatore, non tu.',
  };
}
