const MIGLIAIA_CON_PUNTO = /^\d{1,3}(\.\d{3})+$/;

/**
 * Converte un numero scritto all'italiana ("4.326,00 €", "7,49 %", "35 mesi", "€ 10.434") in number.
 * Restituisce null se vuoto, non numerico o negativo.
 */
export function normalizzaNumero(valore: unknown): number | null {
  if (typeof valore === 'number') return Number.isFinite(valore) && valore >= 0 ? valore : null;
  if (typeof valore !== 'string') return null;
  const grezzo = valore.trim();
  if (grezzo === '' || /^[-−]/.test(grezzo)) return null;
  const pulito = grezzo.replace(/[^\d.,]/g, '');
  if (!/\d/.test(pulito)) return null;
  const ultimaVirgola = pulito.lastIndexOf(',');
  const ultimoPunto = pulito.lastIndexOf('.');
  let normalizzato: string;
  if (ultimaVirgola >= 0 && ultimoPunto >= 0) {
    normalizzato = ultimaVirgola > ultimoPunto
      ? pulito.replace(/\./g, '').replace(',', '.')
      : pulito.replace(/,/g, '');
  } else if (ultimaVirgola >= 0) {
    normalizzato = pulito.replace(/\./g, '').replace(/,(?=.*,)/g, '').replace(',', '.');
  } else if (MIGLIAIA_CON_PUNTO.test(pulito)) {
    normalizzato = pulito.replace(/\./g, '');
  } else {
    normalizzato = pulito;
  }
  const n = Number.parseFloat(normalizzato);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
