import { numero } from '../calc/format';

/**
 * Officina, porta d'ingresso onesta (specifica v2, §4): un modulo corto che raccoglie preventivi anonimi.
 * Nessun giudizio sul prezzo in questa fase: il confronto arriva a dicembre, quando i dati bastano.
 */

/** Lista chiusa dei modelli: i più diffusi in Italia, per marca. Chi non trova il suo sceglie «Altro modello». */
export const MARCHE_OFFICINA = [
  ['Alfa Romeo', ['Giulietta', 'Tonale']],
  ['Audi', ['A3', 'Q3']],
  ['BMW', ['Serie 1', 'X1']],
  ['Citroën', ['C3', 'C3 Aircross']],
  ['Dacia', ['Duster', 'Sandero']],
  ['Fiat', ['500', '500X', 'Grande Panda', 'Panda', 'Punto', 'Tipo']],
  ['Ford', ['Fiesta', 'Focus', 'Puma']],
  ['Hyundai', ['i10', 'i20', 'Tucson']],
  ['Jeep', ['Avenger', 'Compass', 'Renegade']],
  ['Kia', ['Picanto', 'Sportage']],
  ['Lancia', ['Ypsilon']],
  ['Mercedes', ['Classe A', 'GLA']],
  ['MG', ['ZS']],
  ['Nissan', ['Juke', 'Qashqai']],
  ['Opel', ['Corsa', 'Mokka']],
  ['Peugeot', ['208', '2008', '3008']],
  ['Renault', ['Captur', 'Clio']],
  ['SEAT', ['Arona', 'Ibiza']],
  ['Skoda', ['Fabia', 'Octavia']],
  ['Suzuki', ['Ignis', 'Vitara']],
  ['Toyota', ['Aygo X', 'C-HR', 'Yaris', 'Yaris Cross']],
  ['Volkswagen', ['Golf', 'Polo', 'T-Cross', 'T-Roc']],
] as const satisfies readonly (readonly [string, readonly string[]])[];

export const ALTRO_MODELLO = 'Altro modello';

export const MODELLI_OFFICINA = [
  ...MARCHE_OFFICINA.flatMap(([marca, modelli]) => modelli.map((m) => `${marca} ${m}`)),
  ALTRO_MODELLO,
] as readonly string[];

export const INTERVENTI = ['tagliando', 'freni', 'frizione', 'distribuzione', 'gomme', 'revisione', 'batteria', 'climatizzatore', 'altro'] as const;
export type Intervento = (typeof INTERVENTI)[number];

export const ETICHETTE_INTERVENTO: Readonly<Record<Intervento, string>> = {
  tagliando: 'Tagliando',
  freni: 'Freni (pastiglie, dischi)',
  frizione: 'Frizione',
  distribuzione: 'Cinghia o catena di distribuzione',
  gomme: 'Gomme',
  revisione: 'Revisione',
  batteria: 'Batteria',
  climatizzatore: 'Climatizzatore',
  altro: 'Altro intervento',
};

/** Importo massimo accettato: oltre, è quasi sempre un errore di battitura (o un motore nuovo). */
export const IMPORTO_MAX_OFFICINA = 20_000;

/** Il contatore pubblico compare solo da 25 preventivi in su: prima sarebbe un numero piccolo che non dice niente. */
export const SOGLIA_CONTATORE = 25;

export const TESTO_ATTESA =
  'Il confronto con il prezzo giusto arriva a dicembre. Lascia i dati e ti avvisiamo; intanto il tuo preventivo, anonimo, aiuta a costruirlo.';

/** «312 preventivi raccolti», oppure null sotto la soglia o se il numero non è valido. */
export function testoContatore(n: number | null | undefined): string | null {
  if (n == null || !Number.isInteger(n) || n < SOGLIA_CONTATORE) return null;
  return `${numero(n, 0)} preventivi raccolti`;
}
