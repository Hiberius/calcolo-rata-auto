/**
 * Marca, modello e versione finiscono nel titolo pubblico della scheda e nell'immagine condivisibile.
 * Accettiamo solo una marca dall'elenco e modello/versione dall'aspetto di un nome d'auto:
 * niente nomi di concessionari, telefoni, indirizzi, link o parole vietate (§1.1, §1.7).
 * Un valore che non passa viene scartato (la scheda mostra «Il preventivo»), senza bloccare il calcolo.
 */
const MARCHE = [
  'Abarth', 'Alfa Romeo', 'Alpine', 'Aston Martin', 'Audi', 'Bentley', 'BMW', 'BYD', 'Chery', 'Citroën', 'Cupra', 'Dacia',
  'DR', 'DS', 'EVO', 'Ferrari', 'Fiat', 'Ford', 'Honda', 'Hyundai', 'Jaecoo', 'Jaguar', 'Jeep', 'KGM', 'Kia', 'Lamborghini',
  'Lancia', 'Land Rover', 'Leapmotor', 'Lexus', 'Lotus', 'Lynk & Co', 'Maserati', 'Mazda', 'Mercedes-Benz', 'MG', 'Mini',
  'Mitsubishi', 'Nissan', 'Omoda', 'Opel', 'Peugeot', 'Polestar', 'Porsche', 'Renault', 'SEAT', 'Skoda', 'Smart',
  'SsangYong', 'Subaru', 'Suzuki', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo', 'Xpeng', 'Zeekr',
] as const;

const ALIAS: Readonly<Record<string, string>> = { vw: 'Volkswagen', mercedes: 'Mercedes-Benz', citroen: 'Citroën', 'alfa': 'Alfa Romeo' };

function chiave(t: string): string {
  return t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[\s-]+/g, ' ').trim();
}

const PER_CHIAVE: ReadonlyMap<string, string> = new Map([
  ...MARCHE.map((m) => [chiave(m), m] as const),
  ...Object.entries(ALIAS),
]);

const PAROLE_VIETATE = /(truff|fregatur|trappol|ladr|imbrogl|schif|merd|concession|autosalon|salone|officin)/iu;
const PAROLE_SOSPETTE = new Set(['auto', 'autos', 'motors', 'motor', 'group', 'srl', 'spa', 'snc', 'sas', 'tel', 'telefono', 'cell', 'via', 'viale', 'piazza', 'corso', 'www', 'sig', 'signor', 'dott']);
const LINK_O_CONTATTO = /(@|https?:|www\.|\.(it|com|net|eu)\b|\d{5,})/iu;

function ammissibile(t: string, maxParole: number): boolean {
  if (PAROLE_VIETATE.test(t) || LINK_O_CONTATTO.test(t)) return false;
  const parole = t.split(/\s+/);
  return parole.length <= maxParole && !parole.some((p) => PAROLE_SOSPETTE.has(chiave(p)));
}

export function normalizzaMarca(valore: string | null | undefined): string | undefined {
  if (!valore) return undefined;
  return PER_CHIAVE.get(chiave(valore));
}

const RE_MODELLO = /^[\p{L}\p{N}][\p{L}\p{N} .\-]{0,29}$/u;
const RE_VERSIONE = /^[\p{L}\p{N}][\p{L}\p{N} .,\-+&/()]{0,59}$/u;

export function normalizzaModello(valore: string | null | undefined): string | undefined {
  const t = valore?.trim().replace(/\s+/g, ' ');
  return t && RE_MODELLO.test(t) && ammissibile(t, 4) ? t : undefined;
}

export function normalizzaVersione(valore: string | null | undefined): string | undefined {
  const t = valore?.trim().replace(/\s+/g, ' ');
  return t && RE_VERSIONE.test(t) && ammissibile(t, 8) ? t : undefined;
}

export const NORMALIZZA_TESTO_VEICOLO = { marca: normalizzaMarca, modello: normalizzaModello, versione: normalizzaVersione } as const;
