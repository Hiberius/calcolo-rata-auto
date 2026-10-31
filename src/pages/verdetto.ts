import type { APIRoute } from 'astro';
import { paginaRimossa } from '~/lib/rimosse';

export const prerender = false;

/** Pagina tolta il 31/10/2026: 410 per ogni metodo (vedi lib/rimosse.ts). */
export const ALL: APIRoute = () => paginaRimossa();
