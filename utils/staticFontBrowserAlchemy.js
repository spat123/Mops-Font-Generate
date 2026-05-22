/**
 * Генерация VF → static в браузере (@web-alchemy/fonttools / Pyodide).
 * Fallback, когда сервер (Bun/ONREZA) отдаёт 500 без Pyodide.
 */
import { sanitizeVariableSettingsForInstancer } from './sanitizeVariableSettingsForInstancer';

function isWoff2Buffer(buf) {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return b.length >= 4 && b[0] === 0x77 && b[1] === 0x4f && b[2] === 0x46 && b[3] === 0x32;
}

function toBuffer(bytes) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes);
  }
  return bytes;
}

/**
 * @param {ArrayBuffer} fontBuffer
 * @param {Record<string, number>} variableSettings
 * @param {string} [format]
 */
export async function generateStaticFontInBrowser(fontBuffer, variableSettings, format = 'woff2') {
  if (typeof window === 'undefined') {
    throw new Error('Браузерная генерация доступна только на клиенте');
  }

  const { instantiateVariableFont, subset } = await import('@web-alchemy/fonttools');
  const options = sanitizeVariableSettingsForInstancer(variableSettings);
  const input = typeof Buffer !== 'undefined' ? Buffer.from(fontBuffer) : new Uint8Array(fontBuffer);

  let out = await instantiateVariableFont(input, options);
  const want = String(format || 'woff2').toLowerCase();
  if (want === 'woff2' && !isWoff2Buffer(out)) {
    out = await subset(toBuffer(out), { '*': true, flavor: 'woff2' });
  }

  return {
    buffer: toBuffer(out),
    engine: 'web-alchemy-browser',
    renameApplied: false,
  };
}
