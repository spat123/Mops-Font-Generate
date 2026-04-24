import { arrayBufferToBase64, base64ToArrayBuffer } from './base64Utils';

function mimeTypeForFontExt(ext) {
  const e = String(ext || 'woff2').toLowerCase();
  return `font/${e === 'otf' ? 'otf' : e === 'ttf' ? 'ttf' : e === 'woff' ? 'woff' : 'woff2'}`;
}

export async function convertBlobToFormat(blob, format) {
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
      const json = await response.json();
      details = json?.details || json?.error || details;
    } catch {
      // ignore
    }
    throw new Error(details);
  }

  const payload = await response.json();
  const outBase64 = payload?.data;
  if (!outBase64) throw new Error('Пустой ответ конвертера');
  const outBuffer = base64ToArrayBuffer(outBase64);
  return new Blob([outBuffer], { type: mimeTypeForFontExt(targetFormat) });
}

