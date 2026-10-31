import { normalizzaNumero } from '../numeri';
import {
  CAMPI_NUMERICI, CAMPI_TESTO, EstrazioneGrezzaSchema,
  type CampoEstratto, type CampoNumerico, type CampoTesto, type EstrazioneGrezza, type RispostaEstrazione,
} from './schema';

export const SOGLIA_CONFIDENZA = 0.7;

/** Limiti di plausibilità: fuori da qui il valore si scarta e il campo va confermato a mano. */
const LIMITI: Partial<Record<CampoNumerico, { min: number; max: number; intero?: boolean }>> = {
  nRate: { min: 1, max: 120, intero: true },
  tan: { min: 0, max: 30 },
  taegDichiarato: { min: 0, max: 30 },
  kmInclusi: { min: 0, max: 500_000, intero: true },
  rata: { min: 0, max: 20_000 },
};

const DATI_PERSONALI = [
  /[\w.+-]+@[\w-]+\.[\w.]+/,                     // email
  /(?:\+39\s?)?\b3\d{2}[\s.-]?\d{6,7}\b/,        // cellulare
  /\b[A-Z]{2}\d{3}[A-Z]{2}\b/,                   // targa
  /\b[A-HJ-NPR-Z0-9]{17}\b/,                     // telaio
  /\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/i, // codice fiscale
];

export function contieneDatiPersonali(testo: string): boolean {
  return DATI_PERSONALI.some((re) => re.test(testo));
}

function confidenzaDi(grezza: EstrazioneGrezza, campo: string): number {
  return normalizzaNumero(grezza.confidenza?.[campo] ?? null) ?? 0;
}

function numeroPlausibile(campo: CampoNumerico, valore: number | null): number | null {
  if (valore == null) return null;
  const limite = LIMITI[campo];
  if (!limite) return valore;
  if (valore < limite.min || valore > limite.max) return null;
  return limite.intero ? Math.round(valore) : valore;
}

function testoPulito(valore: string | null | undefined): string | null {
  const t = valore?.trim().slice(0, 60);
  if (!t || contieneDatiPersonali(t)) return null;
  return t;
}

function tipoDa(valore: string | null | undefined): 'finanziamento' | 'leasing' | 'noleggio' | null {
  const t = valore?.toLowerCase() ?? '';
  if (t.includes('noleggio')) return 'noleggio';
  if (t.includes('leasing')) return 'leasing';
  if (t.includes('finanz')) return 'finanziamento';
  return null;
}

type Campi = { -readonly [K in keyof RispostaEstrazione['campi']]: RispostaEstrazione['campi'][K] };

/**
 * Valida e normalizza l'output del modello. Scarta testoRilevante (non torna al browser e non si registra),
 * scarta testi con dati personali, segna "da confermare" i campi a bassa confidenza o non plausibili.
 */
export function validaEstrazione(grezzo: unknown): { ok: true; risposta: RispostaEstrazione } | { ok: false } {
  const parsed = EstrazioneGrezzaSchema.safeParse(grezzo);
  if (!parsed.success) return { ok: false };
  const g = parsed.data;
  const numerici = CAMPI_NUMERICI.map((c) => [c, normalizzaNumero(g[c] ?? null)] as const).filter(([, v]) => v != null);
  // Se il modello copia lo stesso importo in contanti e promo, il prezzo in contanti non è davvero scritto: lo togliamo.
  const promo = normalizzaNumero(g.prezzoPromo ?? null);
  const plausibili = numerici
    .filter(([c, v]) => !(c === 'prezzoContanti' && promo != null && v === promo))
    .map(([c, v]) => [c, numeroPlausibile(c, v)] as const);
  const testi = CAMPI_TESTO.map((c) => [c, testoPulito(g[c])] as const).filter(([, v]) => v != null);
  const tipo = tipoDa(g.tipo);
  const campi: Campi = Object.fromEntries([
    ...plausibili.filter(([, v]) => v != null),
    ...testi,
    ...(tipo ? [['tipo', tipo]] : []),
  ]) as Campi;
  const scartati: CampoEstratto[] = plausibili.filter(([, v]) => v == null).map(([c]) => c);
  const incerti: CampoEstratto[] = [
    ...plausibili.filter(([c, v]) => v != null && confidenzaDi(g, c) < SOGLIA_CONFIDENZA).map(([c]) => c),
    ...testi.filter(([c]) => confidenzaDi(g, c) < SOGLIA_CONFIDENZA).map(([c]) => c as CampoTesto),
  ];
  const obbligatoriMancanti: CampoEstratto[] = (['anticipo', 'nRate', 'rata'] as const).filter((c) => campi[c] == null);
  const daConfermare = [...new Set([...scartati, ...incerti, ...obbligatoriMancanti])];
  return { ok: true, risposta: { campi, daConfermare, campiTrovati: Object.keys(campi).length } };
}

export function leggiJson(testo: unknown): unknown {
  if (typeof testo !== 'string') return testo;
  const inizio = testo.indexOf('{');
  const fine = testo.lastIndexOf('}');
  if (inizio < 0 || fine <= inizio) return null;
  try {
    return JSON.parse(testo.slice(inizio, fine + 1));
  } catch {
    return null;
  }
}
