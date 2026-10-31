import { QUOTA_VALORE_RESIDUO } from './config';
import { arrotonda } from './format';
import type { Strada, TipoContratto } from './tipi';

/** Valore dell'auto a fine contratto, come ipotesi: la maxi rata (valore futuro garantito) o una quota del prezzo. */
export function residuoPredefinito(maxiRata: number | undefined, prezzo: number | null): number | null {
  if (maxiRata != null && maxiRata > 0) return maxiRata;
  return prezzo != null ? arrotonda(prezzo * QUOTA_VALORE_RESIDUO, 0) : null;
}

/** Uscito meno quello che l'auto vale ancora: solo per le strade in cui l'auto resta tua. Nessuna classifica. */
export function costoNetto(s: Strada, valoreResiduo: number | null, tipo: TipoContratto): number | null {
  if (valoreResiduo == null || s.totaleUscito == null || s.id === 'C') return null;
  if (s.id === 'B' && tipo === 'noleggio') return null;
  return arrotonda(s.totaleUscito - valoreResiduo);
}
