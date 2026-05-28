import opentype from 'opentype.js';
import decompress from 'woff2-encoder/decompress';
import { normalizeFvarAxisTag } from './fontParser';
import { sanitizeVariableSettingsForInstancer } from './sanitizeVariableSettingsForInstancer';
import type { FvarAxisMeta } from './fontParser';

function isWoff2(buffer: ArrayBuffer): boolean {
  if (!buffer || buffer.byteLength < 4) return false;
  const b = new Uint8Array(buffer);
  return b[0] === 0x77 && b[1] === 0x4f && b[2] === 0x46 && b[3] === 0x32;
}

async function toArrayBuffer(input: ArrayBuffer | ArrayBufferView | Buffer): Promise<ArrayBuffer> {
  if (input instanceof ArrayBuffer) return input;
  if (ArrayBuffer.isView(input)) {
    const view = input as ArrayBufferView;
    return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
  }
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) {
    const buf = input as Buffer;
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  }
  throw new TypeError('Expected ArrayBuffer or Buffer');
}

export async function extractFvarAxesFromBuffer(
  fontBuffer: ArrayBuffer | ArrayBufferView | Buffer,
): Promise<Record<string, FvarAxisMeta> | null> {
  try {
    let buf = await toArrayBuffer(fontBuffer);
    if (isWoff2(buf)) {
      const decompressed = await decompress(new Uint8Array(buf));
      if (decompressed?.buffer) buf = decompressed.buffer as ArrayBuffer;
    }
    const font = opentype.parse(buf);
    const axes = font?.tables?.fvar?.axes;
    if (!Array.isArray(axes) || !axes.length) return null;

    const out: Record<string, FvarAxisMeta> = {};
    for (const axis of axes) {
      const tag = normalizeFvarAxisTag(axis.tag);
      if (!tag) continue;
      out[tag] = {
        name: tag.toUpperCase(),
        min: Number(axis.minValue),
        max: Number(axis.maxValue),
        default: Number(axis.defaultValue),
      };
    }
    return Object.keys(out).length ? out : null;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn('[extractFvarAxesFromBuffer]', message);
    return null;
  }
}

export async function sanitizeSettingsForFontBuffer(
  variableSettings: Record<string, unknown>,
  fontBuffer: ArrayBuffer | Buffer | null | undefined,
): Promise<Record<string, number | null>> {
  const knownAxes = fontBuffer ? await extractFvarAxesFromBuffer(fontBuffer) : null;
  const sanitized = sanitizeVariableSettingsForInstancer(variableSettings, knownAxes);
  if (knownAxes && Object.keys(sanitized).length === 0) {
    for (const [tag, axis] of Object.entries(knownAxes)) {
      const def = Number(axis?.default);
      if (Number.isFinite(def)) sanitized[tag] = def;
    }
  }
  return sanitized;
}
