/**
 * Prima di `wrangler deploy`: ferma il deploy se la configurazione lascia i moduli bloccati o la privacy incompleta.
 * Uso: npm run deploy. Per un deploy provvisorio consapevole (chiavi vere non ancora pronte):
 *   RATAVERA_DEPLOY_PROVVISORIO=1 npm run deploy
 * Legge i vars di wrangler.jsonc e i NOMI dei segreti con `wrangler secret list` (mai i valori).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { leggiJsonc, problemiConfigurazione } from '../src/lib/configurazione';

const RADICE = join(import.meta.dirname, '..');
const WranglerSchema = z.object({ vars: z.record(z.string(), z.string()).default({}) });
const SegretiSchema = z.array(z.object({ name: z.string() }));

function nomiSegreti(): string[] {
  try {
    const uscita = execFileSync('npx', ['wrangler', 'secret', 'list', '--format', 'json'], { cwd: RADICE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const inizio = uscita.indexOf('[');
    if (inizio < 0) throw new Error('risposta senza elenco');
    return SegretiSchema.parse(JSON.parse(uscita.slice(inizio))).map((s) => s.name);
  } catch (e) {
    console.error('[controlla-deploy] non riesco a leggere i segreti del Worker:', e instanceof Error ? e.message : e);
    return [];
  }
}

const wrangler = WranglerSchema.parse(leggiJsonc(readFileSync(join(RADICE, 'wrangler.jsonc'), 'utf8')));
const problemi = problemiConfigurazione({ vars: wrangler.vars, segreti: nomiSegreti() });

// L'indirizzo pubblico deve rispondere: canonical, og:image, sitemap e testo condiviso puntano lì (revisione del 31/10).
const sito = (wrangler.vars['PUBLIC_SITE_URL'] ?? '').trim();
try {
  const r = await fetch(sito, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(8_000) });
  if (r.status !== 200) problemi.push(`PUBLIC_SITE_URL (${sito}) risponde ${r.status}, non 200: i link condivisi non si aprono.`);
} catch (e) {
  problemi.push(`PUBLIC_SITE_URL (${sito || 'vuota'}) non risponde: ${e instanceof Error ? e.message : String(e)}.`);
}
if (problemi.length === 0) {
  console.log('[controlla-deploy] configurazione completa.');
} else {
  const provvisorio = process.env['RATAVERA_DEPLOY_PROVVISORIO'] === '1';
  console.error(`[controlla-deploy] ${problemi.length} problemi di configurazione:`);
  for (const p of problemi) console.error(`  - ${p}`);
  if (!provvisorio) {
    console.error('Deploy fermato. Per un deploy provvisorio consapevole: RATAVERA_DEPLOY_PROVVISORIO=1 npm run deploy');
    process.exit(1);
  }
  console.error('Deploy provvisorio (RATAVERA_DEPLOY_PROVVISORIO=1): i moduli restano non attivi finché mancano le chiavi vere.');
}
