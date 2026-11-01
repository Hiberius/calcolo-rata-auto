const URL_BREVO = 'https://api.brevo.com/v3/smtp/email';

export interface Email {
  readonly oggetto: string;
  readonly testo: string;
}

export type EsitoEmail = { readonly ok: true; readonly id: string } | { readonly ok: false; readonly motivo: 'non_configurata' | 'rifiutata' | 'rete' };

type EnvEmail = Pick<Env, 'BREVO_API_KEY' | 'NOTIFY_EMAIL' | 'EMAIL_MITTENTE'>;

/**
 * Notifica interna a NOTIFY_EMAIL via Brevo (solo testo). Se manca la chiave non si blocca nulla:
 * la richiesta resta in D1 e /admin la mostra.
 */
export async function inviaNotifica(env: EnvEmail, email: Email, invia: typeof fetch = fetch): Promise<EsitoEmail> {
  if (!env.BREVO_API_KEY || !env.NOTIFY_EMAIL) {
    console.warn(`[email] non inviata (BREVO_API_KEY o NOTIFY_EMAIL mancanti): ${email.oggetto}`);
    return { ok: false, motivo: 'non_configurata' };
  }
  try {
    const risposta = await invia(URL_BREVO, {
      method: 'POST',
      headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Rata Vera', email: env.EMAIL_MITTENTE || 'hiberius@gmail.com' },
        to: [{ email: env.NOTIFY_EMAIL }],
        subject: email.oggetto,
        textContent: email.testo,
      }),
    });
    if (!risposta.ok) {
      console.error(`[email] Brevo ha risposto ${risposta.status}: ${email.oggetto}`);
      return { ok: false, motivo: 'rifiutata' };
    }
    const dati = (await risposta.json().catch(() => ({}))) as { messageId?: string };
    return { ok: true, id: dati.messageId ?? 'brevo' };
  } catch {
    console.error(`[email] errore di rete: ${email.oggetto}`);
    return { ok: false, motivo: 'rete' };
  }
}
