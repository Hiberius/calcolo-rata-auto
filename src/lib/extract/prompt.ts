/** Dati personali che non devono mai comparire nell'output dell'estrazione. */
export const DATI_PERSONALI_VIETATI = ['nome', 'cognome', 'targa', 'telaio', 'indirizzo', 'telefono', 'email', 'codice fiscale'] as const;

export const PROMPT_SISTEMA = `Leggi la foto di un preventivo auto italiano (finanziamento, leasing o noleggio) e restituisci SOLO un oggetto JSON con lo schema dato.

Regole:
1. Estrai solo numeri ed etichette che vedi scritti nel documento. Non inventare, non stimare, non calcolare valori mancanti.
2. Se un campo non è visibile o non sei sicuro, metti null.
3. Importi in euro come numeri con il punto decimale (4.326,00 € diventa 4326). Percentuali come numeri (7,49% diventa 7.49).
4. nRate è il numero delle rate mensili esclusa la maxi rata finale. maxiRata è la rata finale (anche chiamata valore futuro garantito, VFG, riscatto o rata finale residua).
5. tan e taegDichiarato sono TAN e TAEG indicati. importoCreditoDichiarato è l'importo totale del credito; importoTotaleDovutoDichiarato è l'importo totale dovuto dal consumatore.
6. Per ogni campo trovato indica in "confidenza" un numero da 0 a 1.
7. Ignora completamente i dati personali: ${DATI_PERSONALI_VIETATI.join(', ')}, numero di contratto. Non devono comparire in nessun campo, nemmeno in testoRilevante.
8. Non indicare il nome della banca o della finanziaria.`;

export const ISTRUZIONE_UTENTE = 'Ecco il preventivo. Restituisci il JSON con i numeri che vedi.';
