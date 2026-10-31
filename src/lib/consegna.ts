import { inviaNotifica, type Email } from './email';
import type { RichiestaNoleggio } from './moduli/schemi';

export interface RichiestaDaConsegnare extends Omit<RichiestaNoleggio, 'consensoContatto' | 'versioneConsenso'> {
  readonly id: string;
}

export interface EsitoConsegna {
  readonly ok: boolean;
  readonly riferimento: string | null;
}

/** §9: consegna della richiesta al partner di noleggio. v1: email; ApiAdapter quando c'è il contratto. */
export interface DeliveryAdapter {
  readonly nome: string;
  consegna(richiesta: RichiestaDaConsegnare): Promise<EsitoConsegna>;
}

export function emailRichiesta(r: RichiestaDaConsegnare): Email {
  return {
    oggetto: `Richiesta noleggio ${r.id}: ${r.modello}, ${r.durataMesi} mesi (${r.provincia})`,
    testo: [
      `Richiesta di noleggio a lungo termine ${r.id}`,
      `Nome: ${r.nome}`,
      `Email: ${r.email}`,
      `Telefono: ${r.telefono}`,
      `Provincia: ${r.provincia}`,
      `Modello: ${r.modello}`,
      `Durata: ${r.durataMesi} mesi`,
      `Km all'anno: ${r.kmAnnui}`,
      `Preferisce anticipo zero: ${r.anticipoZero ? 'sì' : 'no'}`,
      '',
      'Consenso al contatto da parte di Rata Vera registrato in D1 (tabella consensi). Per passare i dati a un partner serve un nuovo consenso che lo nomini.',
    ].join('\n'),
  };
}

export function adattatoreEmail(env: Pick<Env, 'BREVO_API_KEY' | 'NOTIFY_EMAIL' | 'EMAIL_MITTENTE'>, invia: typeof fetch = fetch): DeliveryAdapter {
  return {
    nome: 'email',
    async consegna(richiesta) {
      const esito = await inviaNotifica(env, emailRichiesta(richiesta), invia);
      return esito.ok ? { ok: true, riferimento: `email:${esito.id}` } : { ok: false, riferimento: null };
    },
  };
}
