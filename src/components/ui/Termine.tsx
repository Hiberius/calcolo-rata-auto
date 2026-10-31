import type { ComponentChildren } from 'preact';
import { GLOSSARIO, idTermine, type VoceGlossario } from '~/lib/glossario';

interface Props {
  voce: VoceGlossario;
  /** Parte dell'id: unica nella pagina per ogni coppia ambito + voce. */
  ambito: string;
  /** Testo della parola, se diverso dal termine del glossario (es. "Maxi rata finale"). */
  children?: ComponentChildren;
  /** Solo un «?» accanto a un'etichetta che c'è già (campi del modulo: un pulsante non può stare dentro una label). */
  icona?: boolean;
}

/**
 * Parola con la definizione in una riga: compare al passaggio del puntatore, al tocco e con Invio o Spazio,
 * si chiude con Esc o toccando altrove. Nessuna libreria: il comportamento è in lib/client/glossario.ts.
 */
export default function Termine({ voce, ambito, children, icona = false }: Props) {
  const g = GLOSSARIO[voce];
  const id = idTermine(ambito, voce);
  return (
    <span class={`termine ${icona ? 'termine-icona' : ''}`} data-termine>
      <button type="button" class="termine-voce" aria-expanded="false" aria-describedby={id} data-termine-voce>
        {icona ? (
          <>
            <span aria-hidden="true">?</span>
            <span class="sr-only">Cos'è {g.termine}</span>
          </>
        ) : (children ?? g.termine)}
      </button>
      <span role="tooltip" id={id} class="termine-def">
        <span class="sr-only"> (</span>{g.definizione}<span class="sr-only">)</span>
      </span>
    </span>
  );
}
