/**
 * Raccolta promozioni ufficiali (§7). NON gira nel Worker. Uso:
 *   CF_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=... npm run promo:raccogli [-- --sovrascrivi]
 * Per ogni fonte in fonti.json: Playwright (it-IT) -> testo visibile + screenshot in ../05_Promo/screenshots ->
 * Workers AI con lo schema -> zod (PromoSchema) -> controllo aritmetico con il modulo calcolo.
 * Valide: src/data/promos/<id>.json. Non valide o con numeri che non tornano: ../05_Promo/da-verificare/<id>.json.
 */
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { decodificaPromo } from '../../src/lib/promo';
import { PromoSchema, type Promo } from '../../src/lib/promo/schema';
import { estraiConLlm } from './llm';
import { leggiPagina } from './pagina';

interface Fonte { readonly id: string; readonly marca: string; readonly modello: string; readonly url: string }

const RADICE = join(import.meta.dirname, '..', '..');
const DATASET = join(RADICE, 'src', 'data', 'promos');
const FUORI_REPO = join(RADICE, '..', '05_Promo');
const oggi = new Date().toISOString().slice(0, 10);

async function esiste(percorso: string): Promise<boolean> {
  return access(percorso).then(() => true, () => false);
}

/** Note del controllo aritmetico: discrepanze del modulo calcolo e TAEG da verificare. */
function controlloAritmetico(p: Promo): readonly string[] {
  const d = decodificaPromo(p);
  const note = d.analisi.ricostruzione.discrepanze.map((x) => x.messaggio);
  return d.analisi.taeg.stato === 'da_verificare' ? [...note, d.analisi.taeg.nota] : note;
}

async function raccogliUna(f: Fonte, env: { accountId: string; token: string }, sovrascrivi: boolean): Promise<string> {
  const destinazione = join(DATASET, `${f.id}.json`);
  if (!sovrascrivi && (await esiste(destinazione))) return `${f.id}: già presente, saltata`;
  const pagina = await leggiPagina(f.url, join(FUORI_REPO, 'screenshots', `${f.id}-${oggi}.png`));
  const letti = await estraiConLlm(pagina.testo, f.marca, f.modello, env);
  const candidata = { ...letti, id: f.id, marca: f.marca, modello: f.modello, urlFonte: f.url, dataVerifica: oggi };
  const esito = PromoSchema.safeParse(candidata);
  if (!esito.success) {
    await scriviDaVerificare(f.id, { candidata, errori: esito.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) });
    return `${f.id}: schema non valido, in 05_Promo/da-verificare`;
  }
  const note = controlloAritmetico(esito.data);
  const promo = { ...esito.data, discrepanze: [...note] };
  if (note.length > 0) {
    await scriviDaVerificare(f.id, { promo, nota: 'Numeri che non tornano: controllare a mano sulla fonte prima di pubblicare' });
    return `${f.id}: ${note.length} note aritmetiche, in 05_Promo/da-verificare`;
  }
  await writeFile(destinazione, `${JSON.stringify(promo, null, 2)}\n`);
  return `${f.id}: valida, scritta in src/data/promos`;
}

async function scriviDaVerificare(id: string, contenuto: object): Promise<void> {
  const cartella = join(FUORI_REPO, 'da-verificare');
  await mkdir(cartella, { recursive: true });
  await writeFile(join(cartella, `${id}.json`), `${JSON.stringify(contenuto, null, 2)}\n`);
}

async function principale(): Promise<void> {
  const accountId = process.env['CF_ACCOUNT_ID'] ?? '';
  const token = process.env['CLOUDFLARE_API_TOKEN'] ?? '';
  if (!accountId || !token) throw new Error('Servono CF_ACCOUNT_ID e CLOUDFLARE_API_TOKEN (permesso Workers AI)');
  const fonti = JSON.parse(await readFile(join(import.meta.dirname, 'fonti.json'), 'utf8')) as Fonte[];
  const sovrascrivi = process.argv.includes('--sovrascrivi');
  for (const f of fonti) {
    const esito = await raccogliUna(f, { accountId, token }, sovrascrivi).catch((e: unknown) => `${f.id}: errore, ${e instanceof Error ? e.message : String(e)}`);
    console.log(esito);
  }
}

await principale();
