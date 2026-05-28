/**
 * Переименование name/OS/2 в статическом файле после Pyodide (web-alchemy).
 * На Vercel это делает Python; на ONREZA — opentype.js.
 */
import opentype from 'opentype.js';
import { compress } from 'woff2-encoder';
import decompress from 'woff2-encoder/decompress';

type OpentypeFontMutable = {
  names?: Record<string, { en?: string }>;
  tables?: {
    os2?: {
      usWeightClass?: number;
      fsSelection?: number;
    };
    head?: { macStyle?: number };
  };
  toArrayBuffer: () => ArrayBuffer;
};

export type StaticFontRenameOptions = {
  family?: string;
  subfamily?: string;
  postScriptName?: string;
  weightClass?: number;
};

function isWoff2Buffer(buf: Buffer | Uint8Array): boolean {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  return b.length >= 4 && b[0] === 0x77 && b[1] === 0x4f && b[2] === 0x46 && b[3] === 0x32;
}

async function toParseableBuffer(buffer: Buffer | Uint8Array): Promise<Buffer> {
  let buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (isWoff2Buffer(buf)) {
    const dec = await decompress(new Uint8Array(buf));
    if (dec?.buffer) buf = Buffer.from(dec.buffer, dec.byteOffset, dec.byteLength);
  }
  return buf;
}

function setEnName(font: OpentypeFontMutable, key: string, value: string | undefined): void {
  if (!value) return;
  if (!font.names) font.names = {};
  font.names[key] = { en: String(value) };
}

function applyOs2Style(font: OpentypeFontMutable, subfamily: string, weightClass: number | undefined): void {
  if (!font.tables?.os2) return;
  const os2 = font.tables.os2;
  const w =
    weightClass != null && Number.isFinite(Number(weightClass))
      ? Math.max(1, Math.min(1000, Math.round(Number(weightClass))))
      : Number(os2.usWeightClass) || 400;

  os2.usWeightClass = w;

  let fs = Number(os2.fsSelection) || 0;
  const subLower = String(subfamily || '').toLowerCase();
  const italic = subLower.includes('italic') || subLower.includes('oblique');
  if (italic) fs |= 1;
  else fs &= ~1;
  if (w >= 700) fs |= 0x20;
  else fs &= ~0x20;
  if (!italic && w < 700) fs |= 0x40;
  os2.fsSelection = fs;

  if (font.tables.head) {
    let mac = Number(font.tables.head.macStyle) || 0;
    if (w >= 700) mac |= 1;
    else mac &= ~1;
    if (italic) mac |= 2;
    else mac &= ~2;
    font.tables.head.macStyle = mac;
  }
}

async function encodeToFormat(ttfBuffer: Buffer, format: string): Promise<Buffer> {
  const want = String(format || 'woff2').toLowerCase();
  if (want === 'ttf' || want === 'otf') return ttfBuffer;
  if (want === 'woff2') {
    const out = await compress(Buffer.from(ttfBuffer));
    return Buffer.from(out.buffer, out.byteOffset, out.byteLength);
  }
  try {
    const { subset } = await import('@web-alchemy/fonttools');
    const opts: { '*': boolean; flavor?: string } = { '*': true };
    if (want === 'woff' || want === 'woff2') opts.flavor = want;
    const out = await subset(Buffer.from(ttfBuffer), opts);
    return Buffer.from(out);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn('[applyStaticFontRename] re-encode failed, return TTF:', message);
    return ttfBuffer;
  }
}

export async function applyStaticFontRename(
  buffer: Buffer | Uint8Array,
  rename: StaticFontRenameOptions,
  format = 'woff2',
): Promise<Buffer> {
  const family = String(rename?.family || '').trim();
  const subfamily = String(rename?.subfamily || 'Regular').trim() || 'Regular';
  if (!family) return Buffer.from(buffer);

  const parseBuf = await toParseableBuffer(buffer);
  const font = opentype.parse(parseBuf) as OpentypeFontMutable;

  const postScript =
    String(rename?.postScriptName || '').trim() ||
    `${family}-${subfamily}`
      .replace(/[^A-Za-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 63) ||
    'Font-Static';

  const fullName = `${family} ${subfamily}`.trim();

  setEnName(font, 'fontFamily', family);
  setEnName(font, 'preferredFamily', family);
  setEnName(font, 'fontSubfamily', subfamily);
  setEnName(font, 'preferredSubfamily', subfamily);
  setEnName(font, 'fullName', fullName);
  setEnName(font, 'postScriptName', postScript);
  setEnName(font, 'uniqueID', `${postScript};${Date.now()};${fullName}`);

  applyOs2Style(font, subfamily, rename?.weightClass);

  const ttfOut = Buffer.from(font.toArrayBuffer());
  return encodeToFormat(ttfOut, format);
}
