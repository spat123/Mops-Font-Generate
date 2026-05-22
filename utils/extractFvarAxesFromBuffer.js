/**
 * Читает теги осей fvar из бинарника шрифта (сервер / API).
 * Нужно, чтобы не передавать в fonttools оси вроде `ital`, которых нет в файле (KeyError).
 */
import opentype from 'opentype.js';
import decompress from 'woff2-encoder/decompress';
import { normalizeFvarAxisTag } from './fontParser';
import { sanitizeVariableSettingsForInstancer } from './sanitizeVariableSettingsForInstancer';

function isWoff2(buffer) {
  if (!buffer || buffer.byteLength < 4) return false;
  const b = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  return b[0] === 0x77 && b[1] === 0x4f && b[2] === 0x46 && b[3] === 0x32;
}

async function toArrayBuffer(input) {
  if (input instanceof ArrayBuffer) return input;
  if (ArrayBuffer.isView(input)) {
    return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
  }
  if (Buffer.isBuffer(input)) {
    return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
  }
  throw new TypeError('Expected ArrayBuffer or Buffer');
}

/**
 * @param {ArrayBuffer|Buffer} fontBuffer
 * @returns {Promise<Record<string, { min: number, max: number, default: number }>|null>}
 */
export async function extractFvarAxesFromBuffer(fontBuffer) {
  try {
    let buf = await toArrayBuffer(fontBuffer);
    if (isWoff2(buf)) {
      const decompressed = await decompress(new Uint8Array(buf));
      if (decompressed?.buffer) buf = decompressed.buffer;
    }
    const font = opentype.parse(buf);
    const axes = font?.tables?.fvar?.axes;
    if (!Array.isArray(axes) || !axes.length) return null;

    const out = {};
    for (const axis of axes) {
      const tag = normalizeFvarAxisTag(axis.tag);
      if (!tag) continue;
      out[tag] = {
        min: Number(axis.minValue),
        max: Number(axis.maxValue),
        default: Number(axis.defaultValue),
      };
    }
    return Object.keys(out).length ? out : null;
  } catch (e) {
    console.warn('[extractFvarAxesFromBuffer]', e?.message || e);
    return null;
  }
}

/**
 * @param {Record<string, unknown>} variableSettings
 * @param {ArrayBuffer|Buffer|null|undefined} fontBuffer
 */
export async function sanitizeSettingsForFontBuffer(variableSettings, fontBuffer) {
  const knownAxes = fontBuffer ? await extractFvarAxesFromBuffer(fontBuffer) : null;
  return sanitizeVariableSettingsForInstancer(variableSettings, knownAxes);
}
