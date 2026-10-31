import type { APIRoute } from 'astro';
import { endpointRimosso } from '~/lib/rimosse';

export const prerender = false;

/** Endpoint disattivato il 31/10/2026: 410 per ogni metodo. La tabella D1 resta (vedi lib/rimosse.ts). */
export const ALL: APIRoute = () => endpointRimosso();
