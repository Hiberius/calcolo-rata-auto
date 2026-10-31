/**
 * Raccolta promozioni ufficiali (§7). NON gira nel Worker. Uso:
 *   CF_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=... npm run promo:raccogli [-- --sovrascrivi] [-- --pubblica]
 * Per ogni fonte in fonti.json (validata: id semplice, url https sulla pagina promo di un dominio ufficiale):
 * Playwright (it-IT) -> testo visibile + screenshot in ../05_Promo/screenshots -> Workers AI con lo schema -> zod ->
 * controllo aritmetico. TUTTO finisce in ../05_Promo/da-verificare/<id>.json con lo stato.
 * Solo con --pubblica, e solo se valida, senza note aritmetiche e con almeno una cifra confermata dal testo grezzo,
 * la promo viene scritta in src/data/promos/<id>.json. L'output del modello è un dato non fidato: la pubblicazione
 * resta una scelta umana dopo il controllo sullo screenshot.
 */
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { decodificaPromo } from '../../src/lib/promo';
import { PromoSchema, type Promo } from '../../src/lib/promo/schema';
import { FonteSchema, cifraConfermata, percorsoDentro, type Fonte } from './fonti';
import { estraiConLlm } from './llm';
import { leggiPagina } from './pagina';

const RADICE = join(import.meta.dirname, '..', '..');
const DATASET = join(RADICE, 'src', 'data', 'promos');
const FUORI_REPO = join(RADICE, '..', '05_Promo');
const SCREENSHOTS = join(FUORI_REPO, 'screenshots');
const DA_VERIFICARE = join(FUORI_REPO, 'da-verificare');
const oggi = new Date().toISOString().slice(0, 10);

interface Opzioni { readonly sovrascrivi: boolean; readonly pubblica: boolean }
interface Ambiente { readonly accountId: string; readonly token: string }
type Stato = 'valida' | 'numeri_da_controllare' | 'cifre_non_trovate_nel_testo';

async function esiste(percorso: string): Promise<boolean> {
  return access(percorso).then(() => true, () => false);
}

/** Note del controllo aritmetico: discrepanze del modulo calcolo e TAEG da verificare. */
function controlloAritmetico(p: Promo): readonly string[] {
  const d = decodificaPromo(p);
  const note = d.analisi.ricostruzione.discrepanze.map((x) => x.messaggio);
  return d.analisi.taeg.stato === 'da_verificare' ? [...note, d.analisi.taeg.nota] : note;
}

async function scriviDaVerificare(id: string, contenuto: object): Promise<void> {
  await mkdir(DA_VERIFICARE, { recursive: true });
  await writeFile(percorsoDentro(DA_VERIFICARE, `${id}.json`), `${JSON.stringify(contenuto, null, 2)}\n`);
}

function statoDi(note: readonly string[], confermata: boolean): Stato {
  if (note.length > 0) return 'numeri_da_controllare';
  return confermata ? 'valida' : 'cifre_non_trovate_nel_testo';
}

async function raccogliUna(f: Fonte, env: Ambiente, opz: Opzioni): Promise<string> {
  const destinazione = percorsoDentro(DATASET, `${f.id}.json`);
  if (!opz.sovrascrivi && (await esiste(destinazione))) return `${f.id}: già pubblicata, saltata`;
  const pagina = await leggiPagina(f.url, percorsoDentro(SCREENSHOTS, `${f.id}-${oggi}.png`));
  const letti = await estraiConLlm(pagina.testo, f.marca, f.modello, env);
  const candidata = { ...letti, id: f.id, marca: f.marca, modello: f.modello, urlFonte: f.url, dataVerifica: oggi };
  const esito = PromoSchema.safeParse(candidata);
  if (!esito.success) {
    const errori = esito.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    await scriviDaVerificare(f.id, { stato: 'schema_non_valido', candidata, errori, screenshot: pagina.screenshot });
    return `${f.id}: schema non valido, in 05_Promo/da-verificare`;
  }
  const note = controlloAritmetico(esito.data);
  const promo = { ...esito.data, discrepanze: [...note] };
  const stato = statoDi(note, cifraConfermata(pagina.testo, [promo.rata, promo.taeg, promo.anticipo]));
  await scriviDaVerificare(f.id, { stato, promo, screenshot: pagina.screenshot, nota: 'Controllare sullo screenshot prima di pubblicare' });
  if (opz.pubblica && stato === 'valida') {
    await writeFile(destinazione, `${JSON.stringify(promo, null, 2)}\n`);
    return `${f.id}: valida e confermata dal testo, pubblicata in src/data/promos`;
  }
  const suggerimento = stato === 'valida' ? ' (usa --pubblica per pubblicarla)' : '';
  return `${f.id}: ${stato}, in 05_Promo/da-verificare${suggerimento}`;
}

async function leggiFonti(): Promise<readonly Fonte[]> {
  const grezzo: unknown = JSON.parse(await readFile(join(import.meta.dirname, 'fonti.json'), 'utf8'));
  const esito = z.array(FonteSchema).safeParse(grezzo);
  if (esito.success) return esito.data;
  const errori = esito.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  throw new Error(`fonti.json non valido: ${errori}`);
}

async function principale(): Promise<void> {
  const accountId = process.env['CF_ACCOUNT_ID'] ?? '';
  const token = process.env['CLOUDFLARE_API_TOKEN'] ?? '';
  if (!accountId || !token) throw new Error('Servono CF_ACCOUNT_ID e CLOUDFLARE_API_TOKEN (permesso Workers AI)');
  const opz: Opzioni = { sovrascrivi: process.argv.includes('--sovrascrivi'), pubblica: process.argv.includes('--pubblica') };
  for (const f of await leggiFonti()) {
    const esito = await raccogliUna(f, { accountId, token }, opz).catch((e: unknown) => `${f.id}: errore, ${e instanceof Error ? e.message : String(e)}`);
    console.log(esito);
  }
}

await principale();
