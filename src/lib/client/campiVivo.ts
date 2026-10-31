import type { IpotesiLeggere, NumeriLeggeri } from '~/lib/calc/leggero';
import { normalizzaNumero } from '~/lib/numeri';

export type Variante = 'maxi' | 'vfg' | 'fine' | 'taeg' | 'noleggio' | 'promo';
export type ChiaveVivo =
  | 'prezzo' | 'anticipo' | 'nRate' | 'rata' | 'maxiRata' | 'speseIstruttoria' | 'speseIncassoRata'
  | 'tanRifinanziamento' | 'canoneNoleggio' | 'mesiNoleggio' | 'taegPrestito';

export const CAMPI_VIVO: Record<ChiaveVivo, { readonly etichetta: string; readonly unita: string }> = {
  prezzo: { etichetta: "Prezzo dell'auto", unita: '€' },
  anticipo: { etichetta: 'Anticipo', unita: '€' },
  nRate: { etichetta: 'Numero di rate', unita: 'mesi' },
  rata: { etichetta: 'Rata mensile', unita: '€' },
  maxiRata: { etichetta: 'Maxi rata finale', unita: '€' },
  speseIstruttoria: { etichetta: 'Spese di istruttoria', unita: '€' },
  speseIncassoRata: { etichetta: 'Spese di incasso per rata', unita: '€' },
  tanRifinanziamento: { etichetta: 'TAN se rifinanzi la maxi rata', unita: '%' },
  canoneNoleggio: { etichetta: 'Canone di noleggio', unita: '€/mese' },
  mesiNoleggio: { etichetta: 'Durata del noleggio', unita: 'mesi' },
  taegPrestito: { etichetta: 'TAEG del prestito personale', unita: '%' },
};

const BASE: readonly ChiaveVivo[] = ['prezzo', 'anticipo', 'nRate', 'rata', 'maxiRata'];
export const CAMPI_PER_VARIANTE: Record<Variante, readonly ChiaveVivo[]> = {
  maxi: BASE,
  vfg: BASE,
  fine: [...BASE, 'tanRifinanziamento'],
  taeg: [...BASE, 'speseIstruttoria', 'speseIncassoRata'],
  noleggio: [...BASE, 'canoneNoleggio', 'mesiNoleggio', 'taegPrestito'],
  promo: ['anticipo', 'canoneNoleggio', 'mesiNoleggio', 'taegPrestito'],
};

const IPOTESI: ReadonlySet<ChiaveVivo> = new Set(['tanRifinanziamento', 'canoneNoleggio', 'mesiNoleggio', 'taegPrestito']);
const INTERI: ReadonlySet<ChiaveVivo> = new Set(['nRate', 'mesiNoleggio']);

export type ValoriVivo = Readonly<Partial<Record<ChiaveVivo, string>>>;

export function aTesto(n: number | undefined): string {
  return n == null ? '' : String(n).replace('.', ',');
}

/** Dai campi (stringhe) ai numeri del calcolo. null se un campo scritto non è un numero valido. */
export function daValori(valori: ValoriVivo, base: NumeriLeggeri | null): { numeri: NumeriLeggeri; ipotesi: IpotesiLeggere } | null {
  const numeri: Record<string, unknown> = { ...(base ?? { anticipo: 0, nRate: 0, rata: 0 }) };
  const ipotesi: Record<string, number> = {};
  for (const [k, grezzo] of Object.entries(valori) as [ChiaveVivo, string | undefined][]) {
    if (grezzo == null || grezzo.trim() === '') {
      if (!IPOTESI.has(k) && !['anticipo', 'nRate', 'rata'].includes(k)) delete numeri[k === 'prezzo' ? 'prezzoContanti' : k];
      continue;
    }
    const n = normalizzaNumero(grezzo);
    if (n == null) return null;
    const valore = INTERI.has(k) ? Math.round(n) : n;
    if (IPOTESI.has(k)) ipotesi[k] = valore;
    else numeri[k === 'prezzo' ? 'prezzoContanti' : k] = valore;
  }
  return { numeri: numeri as NumeriLeggeri, ipotesi };
}
