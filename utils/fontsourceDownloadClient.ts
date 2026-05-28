import { base64ToArrayBuffer } from './fontManagerUtils';
import { blobFromBase64FontData } from './fontFormatConvertClient';

export function getFontsourceStaticApiUrl(slug: string, weight = 400, style = 'normal'): string {
  const w = Number.isFinite(Number(weight)) ? Number(weight) : 400;
  const st = String(style || 'normal').trim() === 'italic' ? 'italic' : 'normal';
  return `/api/fontsource/${encodeURIComponent(slug)}?weight=${w}&style=${st}&subset=latin`;
}

export function getFontsourceVariableApiUrl(slug: string): string {
  return `/api/fontsource/${encodeURIComponent(slug)}/variable?subset=latin&style=normal&forceVariable=true`;
}

export async function fetchFontsourceDownloadPayload(url: string): Promise<{
  payload: Record<string, unknown>;
  fontBufferBase64: string;
}> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = (await response.json()) as Record<string, unknown>;
  const fontBufferBase64 = String(payload?.fontBufferBase64 ?? payload?.fontData ?? '');
  if (!fontBufferBase64) throw new Error('Пустой буфер');
  return { payload, fontBufferBase64 };
}

export function fontsourceBlobFromPayload(
  payload: Record<string, unknown>,
  fontBufferBase64: string,
  slug: string,
  { variable = false }: { variable?: boolean } = {},
) {
  const fileNameRaw = String(
    payload?.fileName || payload?.actualFileName || `${slug}${variable ? '-variable' : ''}.woff2`,
  );
  return blobFromBase64FontData(fontBufferBase64, fileNameRaw);
}

/** ArrayBuffer для zip entries (legacy shape в catalogDownloadActions). */
export function fontsourceArrayBufferFromBase64(base64: string): ArrayBuffer {
  return base64ToArrayBuffer(base64);
}
