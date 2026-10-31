export interface Limite {
  readonly nome: string;
  readonly massimo: number;
  readonly finestraSecondi: number;
}

export interface EsitoLimite {
  readonly consentito: boolean;
  readonly superato: string | null;
}

function chiave(limite: Limite, soggetto: string, adesso: number): string {
  const finestra = Math.floor(adesso / 1000 / limite.finestraSecondi);
  return `rl:${limite.nome}:${soggetto}:${finestra}`;
}

/**
 * Contatore a finestra fissa su KV. KV è a consistenza eventuale: il limite è approssimato,
 * sufficiente per frenare gli abusi, non per contabilità esatta.
 */
export async function controllaLimiti(kv: KVNamespace, soggetto: string, limiti: readonly Limite[], adesso = Date.now()): Promise<EsitoLimite> {
  const chiavi = limiti.map((l) => chiave(l, soggetto, adesso));
  const valori = await Promise.all(chiavi.map((k) => kv.get(k)));
  const conteggi = valori.map((v) => Number.parseInt(v ?? '0', 10) || 0);
  const superato = limiti.find((l, i) => (conteggi[i] ?? 0) >= l.massimo);
  if (superato) return { consentito: false, superato: superato.nome };
  await Promise.all(
    limiti.map((l, i) => kv.put(chiavi[i] as string, String((conteggi[i] ?? 0) + 1), { expirationTtl: Math.max(60, l.finestraSecondi + 60) })),
  );
  return { consentito: true, superato: null };
}
