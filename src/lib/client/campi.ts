import type { CampoEstratto } from '../extract/schema';
import { normalizzaNumero } from '../numeri';

export type ChiaveCampo = CampoEstratto | 'provincia';
export type StatoForm = Readonly<Partial<Record<ChiaveCampo, string>>>;

export interface DefCampo {
  readonly chiave: Exclude<ChiaveCampo, 'tipo'>;
  readonly etichetta: string;
  readonly unita: '€' | '%' | 'mesi' | 'km' | '€/km' | '';
  readonly tipo: 'numero' | 'intero' | 'testo';
  readonly obbligatorio?: boolean;
  readonly aiuto?: string;
}

export interface Gruppo {
  readonly titolo: string;
  readonly nota?: string;
  readonly aperto: boolean;
  readonly campi: readonly DefCampo[];
}

const euro = (chiave: DefCampo['chiave'], etichetta: string, extra: Partial<DefCampo> = {}): DefCampo => ({ chiave, etichetta, unita: '€', tipo: 'numero', ...extra });

export const GRUPPI: readonly Gruppo[] = [
  {
    titolo: 'Le rate',
    aperto: true,
    campi: [
      euro('anticipo', 'Anticipo', { obbligatorio: true, aiuto: 'Scrivi 0 se non c’è' }),
      { chiave: 'nRate', etichetta: 'Numero di rate', unita: 'mesi', tipo: 'intero', obbligatorio: true, aiuto: 'Senza contare la maxi rata finale' },
      euro('rata', 'Rata mensile', { obbligatorio: true }),
      euro('maxiRata', 'Maxi rata finale', { aiuto: 'Detta anche valore futuro garantito o rata finale' }),
      euro('primaRataDiversa', 'Prima rata, se diversa'),
    ],
  },
  {
    titolo: 'Il prezzo',
    nota: 'Il prezzo in contanti è il riferimento più chiaro. Se nel preventivo non c’è, chiedilo.',
    aperto: true,
    campi: [euro('prezzoContanti', 'Prezzo in contanti'), euro('prezzoPromo', 'Prezzo promozionale'), euro('prezzoListino', 'Prezzo di listino')],
  },
  {
    titolo: 'Tassi',
    aperto: true,
    campi: [
      { chiave: 'tan', etichetta: 'TAN', unita: '%', tipo: 'numero' },
      { chiave: 'taegDichiarato', etichetta: 'TAEG', unita: '%', tipo: 'numero' },
    ],
  },
  {
    titolo: "L'auto",
    aperto: false,
    campi: [
      { chiave: 'marca', etichetta: 'Marca', unita: '', tipo: 'testo' },
      { chiave: 'modello', etichetta: 'Modello', unita: '', tipo: 'testo' },
      { chiave: 'versione', etichetta: 'Versione', unita: '', tipo: 'testo' },
      { chiave: 'provincia', etichetta: 'Provincia (sigla, facoltativa)', unita: '', tipo: 'testo' },
    ],
  },
  {
    titolo: 'Importi dichiarati',
    nota: 'Di solito sono nella nota in piccolo: servono a controllare che i conti tornino.',
    aperto: false,
    campi: [euro('importoCreditoDichiarato', 'Importo totale del credito'), euro('importoTotaleDovutoDichiarato', 'Importo totale dovuto')],
  },
  {
    titolo: 'Spese',
    aperto: false,
    campi: [
      euro('speseIstruttoria', 'Spese di istruttoria'),
      euro('impostaBollo', 'Imposta di bollo'),
      euro('speseIncassoRata', 'Spese di incasso per rata'),
      euro('ipt', 'IPT'),
      euro('messaSuStrada', 'Messa su strada'),
      euro('polizzeAbbinate', 'Polizze abbinate'),
      euro('serviziAbbinati', 'Servizi abbinati'),
    ],
  },
  {
    titolo: 'Chilometri',
    aperto: false,
    campi: [
      { chiave: 'kmInclusi', etichetta: 'Km inclusi nel contratto', unita: 'km', tipo: 'intero' },
      { chiave: 'costoKmEccedente', etichetta: 'Costo per km in più', unita: '€/km', tipo: 'numero' },
    ],
  },
];

export const TUTTI_I_CAMPI: readonly DefCampo[] = GRUPPI.flatMap((g) => g.campi);

/** Dallo stato del form (stringhe) all'input del modulo calcolo. I campi vuoti non ci sono. */
export function preventivoDaForm(stato: StatoForm): Record<string, unknown> {
  const voci = TUTTI_I_CAMPI.flatMap((c): [string, string | number][] => {
    const grezzo = stato[c.chiave]?.trim() ?? '';
    if (grezzo === '') return [];
    if (c.tipo === 'testo') return [[c.chiave, grezzo]];
    const n = normalizzaNumero(grezzo);
    return [[c.chiave, n == null ? grezzo : c.tipo === 'intero' ? Math.round(n) : n]];
  });
  return { ...Object.fromEntries(voci), tipo: stato.tipo || 'finanziamento' };
}

/** Dall'estrazione allo stato del form, senza toccare quello che l'utente ha già scritto a mano. */
export function unisciEstrazione(stato: StatoForm, campi: Readonly<Record<string, string | number>>): StatoForm {
  const nuovi = Object.entries(campi).map(([k, v]) => [k, typeof v === 'number' ? String(v).replace('.', ',') : v] as const);
  return { ...Object.fromEntries(nuovi), ...Object.fromEntries(Object.entries(stato).filter(([, v]) => v && v.trim() !== '')) };
}
