import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { analizzaLeggero, type NumeriLeggeri } from '~/lib/calc/leggero';
import { t } from '~/markets';
import type { Mercato } from '~/markets/tipi';
import { ripartizioneTotale } from '~/lib/calc/ripartizione';
import { baseScena, cursoriIniziali, possessoFinale, scalaEuro, type Cursori } from '~/lib/calc/scena';
import { inviaEvento } from '~/lib/client/evento';
import { salvaPreventivo } from '~/lib/client/sessione';
import { allaPrimaVista, movimentoPermesso, seguiMovimento } from '~/lib/motion';
import Atto1Flusso from './Atto1Flusso';
import Atto2Curve from './Atto2Curve';
import Atto3Strade from './Atto3Strade';
import MostraVenditore from './MostraVenditore';

interface Props {
  /** Numeri del preventivo già validati (home) o della promozione: la scena li ricalcola con il motore leggero. */
  preventivo: NumeriLeggeri;
  /** Valore futuro garantito dalla casa, se la promozione lo dichiara. */
  vfg?: number | null | undefined;
  /** Etichetta sopra la scena (es. preventivo d'esempio). */
  etichetta?: string | undefined;
  /** Mercato del calcolo e dei testi (specifica v2, §5). Senza, l'Italia. */
  mercato?: Mercato | undefined;
}

function useMenoMovimento(): boolean {
  const [ridotto, setRidotto] = useState(() => !movimentoPermesso());
  useEffect(() => seguiMovimento((permesso) => setRidotto(!permesso)), []);
  return ridotto;
}

/** La scena del risultato (specifica v2, §2): tre atti su un pannello inchiostro, poi la tabella completa resta sotto. */
export default function Scena({ preventivo, vfg = null, etichetta, mercato }: Props) {
  const analisi = useMemo(() => analizzaLeggero(preventivo, {}, mercato), [preventivo, mercato]);
  const base = useMemo(() => (analisi ? baseScena(analisi, vfg) : null), [analisi, vfg]);
  const [cursori, setCursori] = useState<Cursori | null>(base ? cursoriIniziali(base) : null);
  const [venditore, setVenditore] = useState(false);
  const statico = useMenoMovimento();
  const radice = useRef<HTMLDivElement>(null);
  const interagito = useRef(false);

  useEffect(() => {
    setCursori(base ? cursoriIniziali(base) : null);
    interagito.current = false;
  }, [base]);

  useEffect(() => {
    const el = radice.current;
    return el ? allaPrimaVista(el, () => inviaEvento('scena_vista'), 0.2) : undefined;
  }, []);

  const ripartizione = useMemo(() => (analisi ? ripartizioneTotale(analisi) : null), [analisi]);
  const possesso = useMemo(() => (analisi && base ? possessoFinale(analisi, base) : null), [analisi, base]);

  if (!analisi || !base || !cursori || !ripartizione || !possesso) return null;
  const scala = scalaEuro(analisi);
  const m = analisi.mercato;

  function cambiaCursori(c: Cursori) {
    setCursori(c);
    if (interagito.current) return;
    interagito.current = true;
    inviaEvento('scena_atto2_interagito');
  }

  function apriVenditore() {
    setVenditore(true);
    inviaEvento('mostra_venditore');
  }

  return (
    <div ref={radice} class="pannello-scena" data-scena data-scena-statica={statico ? 'true' : 'false'}>
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid gap-2">
          {etichetta && <p class="numeri w-fit rounded-[var(--raggio)] border border-[var(--scena-tenue)] px-2 py-0.5 text-xs uppercase tracking-[0.08em]" data-etichetta-scena>{etichetta}</p>}
          <h2 class="numeri text-xs font-medium uppercase tracking-[0.08em] text-[var(--scena-tenue)]">{t(m, 'scena.titolo')}</h2>
        </div>
        <button type="button" class="btn btn-scena" onClick={apriVenditore} data-mostra-venditore>{t(m, 'scena.venditore')}</button>
      </header>
      <Atto1Flusso
        ripartizione={ripartizione}
        scala={scala}
        statico={statico}
        quotaRata={analisi.verdetto.quotaRata}
        nRate={analisi.preventivo.nRate}
        rata={analisi.preventivo.rata}
        sommaRate={analisi.totali.sommaRate}
        m={m}
      />
      <Atto2Curve base={base} cursori={cursori} onCursori={cambiaCursori} statico={statico} tipo={analisi.preventivo.tipo} m={m} />
      <Atto3Strade
        strade={analisi.treStrade}
        possesso={possesso}
        scala={scala}
        statico={statico}
        onConfronta={() => salvaPreventivo(analisi.preventivo)}
        m={m}
      />
      <MostraVenditore analisi={analisi} aperta={venditore} onChiudi={() => setVenditore(false)} />
    </div>
  );
}
