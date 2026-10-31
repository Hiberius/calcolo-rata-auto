import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { analizza, type IpotesiInput } from '~/lib/calc';
import { IPOTESI_PREDEFINITE } from '~/lib/calc/config';
import { residuoPredefinito } from '~/lib/calc/residuo';
import { inviaEvento } from '~/lib/client/evento';
import { leggiPreventivo } from '~/lib/client/sessione';
import { normalizzaNumero } from '~/lib/numeri';
import Disclaimer from '../ui/Disclaimer';
import { aTesto } from '~/lib/client/campiVivo';
import CampoNumero from './CampoNumero';
import ColonneStrade from './ColonneStrade';

type Campo = { readonly chiave: string; readonly etichetta: string; readonly unita: string; readonly aiuto?: string };
const PREVENTIVO: readonly Campo[] = [
  { chiave: 'prezzoContanti', etichetta: 'Prezzo in contanti', unita: '€' },
  { chiave: 'anticipo', etichetta: 'Anticipo', unita: '€' },
  { chiave: 'nRate', etichetta: 'Numero di rate', unita: 'mesi' },
  { chiave: 'rata', etichetta: 'Rata mensile', unita: '€' },
  { chiave: 'maxiRata', etichetta: 'Maxi rata finale', unita: '€', aiuto: 'Lascia vuoto se non c’è' },
];
const IPOTESI: readonly Campo[] = [
  { chiave: 'taegPrestito', etichetta: 'TAEG del prestito', unita: '%', aiuto: 'Il totale della strada A usa il TAEG' },
  { chiave: 'canoneNoleggio', etichetta: 'Canone di noleggio', unita: '€/mese', aiuto: 'Dall’offerta di noleggio che hai visto' },
  { chiave: 'mesiNoleggio', etichetta: 'Durata', unita: 'mesi' },
  { chiave: 'kmAnnui', etichetta: 'Km all’anno', unita: 'km' },
  { chiave: 'valoreResiduo', etichetta: 'Valore dell’auto a fine contratto', unita: '€', aiuto: 'Ipotesi: la maxi rata o il 45% del prezzo' },
];
const INTERI = new Set(['nRate', 'mesiNoleggio', 'kmAnnui']);
type Valori = Readonly<Record<string, string>>;

function numeri(valori: Valori, chiavi: readonly Campo[]): Record<string, number> | null {
  const voci: [string, number][] = [];
  for (const { chiave } of chiavi) {
    const grezzo = valori[chiave]?.trim() ?? '';
    if (grezzo === '') continue;
    const n = normalizzaNumero(grezzo);
    if (n == null) return null;
    voci.push([chiave, INTERI.has(chiave) ? Math.round(n) : n]);
  }
  return Object.fromEntries(voci);
}

/** L'esempio della home (offerta ufficiale Peugeot 208, ottobre 2026): stessi numeri, dichiarato come esempio. */
const ESEMPIO: Valori = { prezzoContanti: '14.950', anticipo: '4.326', nRate: '35', rata: '99', maxiRata: '10.434' };

const IPOTESI_INIZIALI: Valori = {
  taegPrestito: aTesto(IPOTESI_PREDEFINITE.taegPrestito),
  kmAnnui: String(IPOTESI_PREDEFINITE.kmAnnui),
};

/** §9: stessa auto, tre strade. Il preventivo arriva dalla home (sessionStorage) o si scrive qui. */
export default function TreStrade() {
  const [base, setBase] = useState<Readonly<Record<string, unknown>>>({});
  const [valori, setValori] = useState<Valori>({});
  const [esempio, setEsempio] = useState(false);
  const [ipotesi, setIpotesi] = useState<Valori>(IPOTESI_INIZIALI);
  const segnalato = useRef(false);

  useEffect(() => {
    const salvato = leggiPreventivo();
    if (!salvato || !analizza(salvato).ok) return;
    setBase(salvato);
    setValori(Object.fromEntries(PREVENTIVO.map(({ chiave }) => [chiave, typeof salvato[chiave] === 'number' ? aTesto(salvato[chiave] as number) : ''])));
  }, []);

  const calcolo = useMemo(() => {
    const p = numeri(valori, PREVENTIVO);
    const i = numeri(ipotesi, IPOTESI);
    if (!p || !i || p['anticipo'] == null || p['nRate'] == null || p['rata'] == null) return null;
    const { valoreResiduo, ...resto } = i;
    const sessione = Object.fromEntries(Object.entries(base).filter(([k]) => !PREVENTIVO.some((c) => c.chiave === k)));
    const esito = analizza({ ...sessione, ...p }, resto as IpotesiInput);
    if (!esito.ok) return null;
    const residuo = valoreResiduo ?? residuoPredefinito(esito.analisi.preventivo.maxiRata, esito.analisi.totali.prezzoRiferimento);
    return { analisi: esito.analisi, residuo };
  }, [base, valori, ipotesi]);

  useEffect(() => {
    if (calcolo && !segnalato.current) {
      segnalato.current = true;
      inviaEvento('tre_strade_usato');
    }
  }, [calcolo]);

  const campo = (c: Campo, v: Valori, imposta: (f: (s: Valori) => Valori) => void) => (
    <CampoNumero key={c.chiave} nome={c.chiave} etichetta={c.etichetta} unita={c.unita} aiuto={c.aiuto} valore={v[c.chiave] ?? ''}
      onCambia={(nuovo) => { setEsempio(false); imposta((s) => ({ ...s, [c.chiave]: nuovo })); }} />
  );

  return (
    <div class="grid gap-8" data-tre-strade>
      <div class="grid gap-8 lg:grid-cols-2">
        <fieldset class="grid gap-3 sm:grid-cols-2">
          <legend class="mb-3 font-semibold">Il preventivo</legend>
          {PREVENTIVO.map((c) => campo(c, valori, setValori))}
        </fieldset>
        <fieldset class="grid gap-3 sm:grid-cols-2">
          <legend class="mb-3 font-semibold">Le ipotesi, sempre modificabili</legend>
          {IPOTESI.map((c) => campo(c, ipotesi, setIpotesi))}
        </fieldset>
      </div>
      <div aria-live="polite">
        {calcolo
          ? <ColonneStrade strade={calcolo.analisi.treStrade} valoreResiduo={calcolo.residuo} tipo={calcolo.analisi.preventivo.tipo} />
          : (
            // A riposo non un muro di campi vuoti: una frase e l'esempio pronto, dichiarato come tale.
            <div class="riquadro grid gap-3 px-5 py-5 sm:flex sm:items-center sm:justify-between sm:gap-6" data-tre-strade-vuoto>
              <p class="max-w-[30em]">Scrivi anticipo, numero di rate e rata del tuo preventivo: le tre strade compaiono qui e si aggiornano mentre scrivi.</p>
              <button type="button" class="btn btn-secondario shrink-0" onClick={() => { setValori(ESEMPIO); setEsempio(true); }}>Prova con la Peugeot 208 d’esempio</button>
            </div>
          )}
        {calcolo && esempio && <p class="etichetta pt-3" data-tre-strade-esempio>Esempio: Peugeot 208 Style, offerta ufficiale di ottobre 2026. Aggiungi un canone di noleggio per la terza strada.</p>}
      </div>
      <Disclaimer ambito="tre-strade" />
    </div>
  );
}
