import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AVVERTENZA } from '~/lib/calc/config';
import { datiTitolare, rigaFiducia, testoFiducia } from '~/lib/fiducia';

const TESTO_ATTESO =
  'Rata Vera è un progetto indipendente di Christian Calabrò (P.IVA 01234567890, Via Roma 1, Milano). È gratuito. Non prendiamo compensi da banche o finanziarie e non consigliamo finanziamenti. Se chiedi un preventivo di noleggio a lungo termine e lo firmi, il noleggiatore può riconoscerci un compenso: lo diciamo prima, qui.';

function fileDi(cartella: string): string[] {
  return readdirSync(cartella).flatMap((nome) => {
    const percorso = join(cartella, nome);
    return statSync(percorso).isDirectory() ? fileDi(percorso) : /\.(astro|tsx?|md)$/.test(nome) ? [percorso] : [];
  });
}

describe('chi c’è dietro e come guadagniamo', () => {
  it('compone il testo con P.IVA e sede dalle variabili pubbliche', () => {
    expect(testoFiducia(datiTitolare({ PUBLIC_PIVA: ' 01234567890 ', PUBLIC_SEDE: 'Via Roma 1, Milano' }))).toBe(TESTO_ATTESO);
  });

  it('senza variabili scrive «in aggiornamento», mai un segnaposto', () => {
    const testo = testoFiducia(datiTitolare({ PUBLIC_PIVA: '', PUBLIC_SEDE: undefined }, {}));
    expect(testo).toContain('(P.IVA in aggiornamento, sede in aggiornamento)');
    expect(testo).not.toMatch(/\{\{|\}\}/);
  });

  it('riga della home: senza P.IVA e sede non scrive «in pubblicazione» né «noleggiatore»; con i dati li mostra (test del 31/10 notte)', () => {
    const senza = rigaFiducia(datiTitolare({}, {}));
    expect(senza.dietro).toBe('Chi c’è dietro: Christian Calabrò, una persona, non un concessionario né una banca.');
    expect(`${senza.dietro} ${senza.paga}`).not.toMatch(/in pubblicazione|in aggiornamento|noleggiatore/);
    expect(senza.paga).toContain('Per te è gratis e non ti proponiamo offerte');
    const con = rigaFiducia(datiTitolare({ PUBLIC_PIVA: '01234567890', PUBLIC_SEDE: 'Via Roma 1, Milano' }));
    expect(con.dietro).toBe('Chi c’è dietro: Christian Calabrò (P.IVA 01234567890, Via Roma 1, Milano), una persona, non un concessionario né una banca.');
  });

  it('le variabili del Worker vincono su quelle di build', () => {
    expect(datiTitolare({ PUBLIC_PIVA: '111' }, { PUBLIC_PIVA: '222', PUBLIC_SEDE: 'Bari' })).toEqual({ piva: '111', sede: 'Bari' });
  });

  it('nessuna contraddizione: da nessuna parte «non siamo intermediari» accanto al compenso sul noleggio', () => {
    expect(AVVERTENZA).not.toMatch(/intermediari/i);
    for (const f of fileDi('src')) {
      const testo = readFileSync(f, 'utf8');
      expect(testo, f).not.toMatch(/né un intermediario|non siamo (degli )?intermediari|compenso dal partner/i);
    }
  });

  it('nessuna parola vietata nei testi del sito', () => {
    // veicolo.ts contiene l'elenco delle parole da scartare nei testi degli utenti: è il filtro, non un testo del sito.
    for (const f of fileDi('src').filter((x) => !x.endsWith('veicolo.ts'))) {
      expect(readFileSync(f, 'utf8').toLowerCase(), f).not.toMatch(/truff|fregatur|trappol/);
    }
  });
});
