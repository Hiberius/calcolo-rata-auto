/** Eventi che il browser può segnalare (gli altri li registra il server). Mai dati personali o di credito. */
export type EventoClient = 'scheda_condivisa' | 'tre_strade_usato' | 'verdetto_click' | 'b2b_click' | 'decodifica_manuale';

export function inviaEvento(nome: EventoClient, schedaId?: string): void {
  try {
    const corpo = JSON.stringify(schedaId ? { nome, schedaId } : { nome });
    if (navigator.sendBeacon?.('/api/evento', new Blob([corpo], { type: 'application/json' }))) return;
    void fetch('/api/evento', { method: 'POST', body: corpo, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => undefined);
  } catch {
    // Le misure non devono mai bloccare la pagina.
  }
}
