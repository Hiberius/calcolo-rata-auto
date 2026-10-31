/** Rende in PNG un albero di nodi Satori con i due font del sito, scaricando solo i glifi usati. */
export async function rendiPng(nodo: unknown, dimensioni: { readonly width: number; readonly height: number }, testoUsato: string): Promise<ArrayBuffer> {
  const { ImageResponse, loadGoogleFont } = await import('workers-og');
  // workers-og non codifica il parametro text: lo codifichiamo qui (€, ×, · e + altrimenti si perdono).
  const testo = encodeURIComponent([...new Set(testoUsato)].join(''));
  const [sans, mono] = await Promise.all([
    loadGoogleFont({ family: 'Instrument Sans', weight: 600, text: testo }),
    loadGoogleFont({ family: 'JetBrains Mono', weight: 500, text: testo }),
  ]);
  const risposta = new ImageResponse(nodo as unknown as string, {
    ...dimensioni,
    fonts: [
      { name: 'Instrument Sans', data: sans, weight: 600, style: 'normal' },
      { name: 'JetBrains Mono', data: mono, weight: 500, style: 'normal' },
    ],
  });
  return risposta.arrayBuffer();
}
