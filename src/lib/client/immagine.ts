export const LATO_MAX = 1600;
export const QUALITA_JPEG = 0.85;
export const DIMENSIONE_MAX = 2 * 1024 * 1024;

function eHeic(file: File): boolean {
  return /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

function ePdf(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

function canvasInJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((risolvi, rifiuta) => {
    canvas.toBlob((b) => (b ? risolvi(b) : rifiuta(new Error('conversione'))), 'image/jpeg', QUALITA_JPEG);
  });
}

function ridimensiona(sorgente: CanvasImageSource & { width: number; height: number }): Promise<Blob> {
  const scala = Math.min(1, LATO_MAX / Math.max(sorgente.width, sorgente.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sorgente.width * scala);
  canvas.height = Math.round(sorgente.height * scala);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(sorgente, 0, 0, canvas.width, canvas.height);
  return canvasInJpeg(canvas);
}

async function daHeic(file: File): Promise<Blob> {
  const { default: heic2any } = await import('heic2any');
  const risultato = await heic2any({ blob: file, toType: 'image/jpeg', quality: QUALITA_JPEG });
  return Array.isArray(risultato) ? (risultato[0] as Blob) : risultato;
}

/** Prima e seconda pagina del PDF, una sotto l'altra, in un'unica immagine. pdf.js si carica solo qui. */
async function daPdf(file: File): Promise<HTMLCanvasElement> {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const documento = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pagine = await Promise.all(
    Array.from({ length: Math.min(2, documento.numPages) }, (_, i) => documento.getPage(i + 1)),
  );
  const tele = await Promise.all(
    pagine.map(async (pagina) => {
      const base = pagina.getViewport({ scale: 1 });
      const viewport = pagina.getViewport({ scale: LATO_MAX / base.width });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await pagina.render({ canvas, viewport }).promise;
      return canvas;
    }),
  );
  const unito = document.createElement('canvas');
  unito.width = Math.max(...tele.map((t) => t.width));
  unito.height = tele.reduce((h, t) => h + t.height, 0);
  const ctx = unito.getContext('2d');
  if (!ctx) throw new Error('canvas');
  tele.reduce((y, t) => (ctx.drawImage(t, 0, y), y + t.height), 0);
  return unito;
}

/** Porta qualsiasi foto o PDF a un JPEG di massimo 1600 px sul lato lungo. Tutto nel browser. */
export async function preparaImmagine(file: File): Promise<Blob> {
  if (ePdf(file)) return ridimensiona(await daPdf(file));
  const sorgente = eHeic(file) ? await daHeic(file) : file;
  const bitmap = await createImageBitmap(sorgente);
  try {
    return await ridimensiona(bitmap);
  } finally {
    bitmap.close();
  }
}

export const MESSAGGI_FILE = {
  formato: 'Questo file non si apre: prova con una foto (JPEG, PNG, HEIC) o un PDF.',
  grande: 'Anche ridotta, l’immagine supera 2 MB: ritaglia la parte con i numeri.',
} as const;
