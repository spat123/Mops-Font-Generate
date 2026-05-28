import { arrayBufferToBase64, base64ToArrayBuffer } from './base64Utils';

export function mimeTypeForFontExt(ext: unknown): string {
  const e = String(ext || 'woff2').toLowerCase();
  return `font/${e === 'otf' ? 'otf' : e === 'ttf' ? 'ttf' : e === 'woff' ? 'woff' : 'woff2'}`;
}

/** Конвертирует blob только если целевой формат отличается от `woff2` shortcut. */
export async function ensureFontBlobFormat(blob: Blob, format: string): Promise<Blob> {
  const targetFormat = String(format || 'woff2').toLowerCase();
  return targetFormat === 'woff2' ? blob : convertBlobToFormat(blob, targetFormat);
}

export function blobFromBase64FontData(
  base64: string,
  fileName = '',
): { ext: string; blob: Blob } {
  const ext = String(fileName || '').split('.').pop()?.toLowerCase() || 'woff2';
  const buffer = base64ToArrayBuffer(base64);
  return {
    ext,
    blob: new Blob([buffer], { type: mimeTypeForFontExt(ext) }),
  };
}

export async function convertBlobToFormat(blob: Blob, format: string): Promise<Blob> {
  const targetFormat = String(format || 'woff2').toLowerCase();
  if (targetFormat === 'woff2') return blob;

  const sourceBuffer = await blob.arrayBuffer();
  const response = await fetch('/api/convert-font-format', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fontData: arrayBufferToBase64(sourceBuffer),
      targetFormat,
    }),
  });

  if (!response.ok) {
    let details = `HTTP ${response.status}`;
    try {
      const json = (await response.json()) as { details?: string; error?: string };
      details = json?.details || json?.error || details;
    } catch {
      // ignore
    }
    throw new Error(details);
  }

  const payload = (await response.json()) as { data?: string };
  const outBase64 = payload?.data;
  if (!outBase64) throw new Error('Пустой ответ конвертера');
  const outBuffer = base64ToArrayBuffer(outBase64);
  return new Blob([outBuffer], { type: mimeTypeForFontExt(targetFormat) });
}
