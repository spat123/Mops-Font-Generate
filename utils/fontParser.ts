import opentype from 'opentype.js';
import { toast } from './appNotify';
import { extractBasicGlyphData, type OpentypeFontLike as GlyphOpentypeFont } from './glyphUtils';
import decompress from 'woff2-encoder/decompress';
import type { SessionFontRecord } from '../types/editorFonts';

export type FvarAxisMeta = {
  name: string;
  min: number;
  max: number;
  default: number;
};

type OpentypeFontLike = {
  tables?: {
    fvar?: {
      axes?: Array<{
        tag?: unknown;
        minValue?: number;
        maxValue?: number;
        defaultValue?: number;
        name?: unknown;
      }>;
    };
  };
};

const isWoff2 = (buffer: ArrayBuffer): boolean => {
  if (!buffer || buffer.byteLength < 4) return false;
  try {
    const signature = String.fromCharCode(...new Uint8Array(buffer.slice(0, 4)));
    return signature === 'wOF2';
  } catch (e) {
    console.error('Error checking WOFF2 signature:', e);
    return false;
  }
};

export const isVariableFont = (fontData: OpentypeFontLike | null | undefined): boolean => {
  return Boolean(fontData?.tables?.fvar);
};

/** Тег оси в fvar -> 4-символьная строка. */
export function normalizeFvarAxisTag(tag: unknown): string {
  if (tag == null) return '';
  if (typeof tag === 'string') {
    const t = tag.trim();
    return t.length <= 4 ? t : t.slice(0, 4);
  }
  if (Array.isArray(tag)) {
    return tag
      .map((c) =>
        typeof c === 'number' ? String.fromCharCode(c & 0xff) : typeof c === 'string' ? c : '',
      )
      .join('')
      .slice(0, 4);
  }
  return String(tag).slice(0, 4);
}

function axisDisplayName(axis: { name?: unknown }, tag: string): string {
  const n = axis?.name;
  if (n && typeof n === 'object' && n !== null && 'en' in (n as Record<string, unknown>)) {
    return String((n as Record<string, unknown>).en);
  }
  if (typeof n === 'string' && n.trim()) return n.trim();
  return String(tag).toUpperCase();
}

export async function mergeFvarAxesFromFontInputs(
  inputs: Array<OpentypeFontLike | Blob | ArrayBuffer | null | undefined>,
): Promise<Record<string, FvarAxisMeta> | null> {
  if (!Array.isArray(inputs) || inputs.length === 0) return null;

  const parseBag: Array<{
    n: number;
    axes: NonNullable<NonNullable<OpentypeFontLike['tables']>['fvar']>['axes'];
  }> = [];
  for (const inp of inputs) {
    if (!inp) continue;
    let parsed: OpentypeFontLike | null = null;
    if (
      typeof inp === 'object' &&
      !(inp instanceof Blob) &&
      !(inp instanceof ArrayBuffer) &&
      inp.tables?.fvar &&
      Array.isArray(inp.tables.fvar.axes)
    ) {
      parsed = inp;
    } else if (inp instanceof Blob) {
      const buf = await inp.arrayBuffer();
      parsed = await parseFontBuffer(buf, 'merge-fvar');
    } else if (inp instanceof ArrayBuffer) {
      parsed = await parseFontBuffer(inp, 'merge-fvar');
    }
    const axes = parsed?.tables?.fvar?.axes;
    if (!axes?.length) continue;
    parseBag.push({ n: axes.length, axes });
  }
  if (!parseBag.length) return null;

  parseBag.sort((a, b) => b.n - a.n);

  const merged: Record<string, FvarAxisMeta> = {};
  for (const { axes } of parseBag) {
    for (const axis of axes || []) {
      const tag = normalizeFvarAxisTag(axis.tag);
      if (!tag) continue;
      const mn = Number(axis.minValue);
      const mx = Number(axis.maxValue);
      const def = Number(axis.defaultValue);
      const name = axisDisplayName(axis, tag);
      if (!merged[tag]) {
        merged[tag] = {
          name,
          min: Number.isFinite(mn) ? mn : 0,
          max: Number.isFinite(mx) ? mx : 0,
          default: Number.isFinite(def) ? def : 0,
        };
      } else {
        if (Number.isFinite(mn)) merged[tag].min = Math.min(merged[tag].min, mn);
        if (Number.isFinite(mx)) merged[tag].max = Math.max(merged[tag].max, mx);
      }
    }
  }

  const richest = parseBag[0].axes || [];
  for (const axis of richest) {
    const tag = normalizeFvarAxisTag(axis.tag);
    if (!merged[tag]) continue;
    const def = Number(axis.defaultValue);
    if (Number.isFinite(def)) merged[tag].default = def;
    const nm = axisDisplayName(axis, tag);
    if (nm) merged[tag].name = nm;
  }

  return merged;
}

export async function parseFontBuffer(
  buffer: ArrayBuffer,
  fontName = 'unknown',
): Promise<OpentypeFontLike | null> {
  return parseFontBufferFromArrayBuffer(buffer, fontName);
}

async function parseFontBufferFromArrayBuffer(
  buffer: ArrayBuffer,
  fontName = 'font',
): Promise<OpentypeFontLike | null> {
  if (!buffer || !(buffer instanceof ArrayBuffer) || buffer.byteLength === 0) {
    console.error(`[${fontName}] Invalid or empty buffer provided for direct parsing.`);
    return null;
  }

  let processedBuffer = buffer;

  try {
    if (isWoff2(buffer)) {
      try {
        if (typeof decompress !== 'function') {
          throw new Error('woff2-encoder decompress function is not available. Check import.');
        }
        const decompressedData = await decompress(new Uint8Array(buffer));
        if (!decompressedData) {
          throw new Error('woff2-encoder decompression returned null or undefined.');
        }
        processedBuffer = decompressedData.buffer as ArrayBuffer;
      } catch (decompError) {
        const message = decompError instanceof Error ? decompError.message : String(decompError);
        toast.error(`Ошибка декомпрессии WOFF2 для ${fontName}: ${message}`);
        console.error(`[Main] WOFF2 decompression failed for ${fontName}:`, decompError);
        return null;
      }
    }

    if (typeof opentype === 'undefined' || typeof opentype.parse !== 'function') {
      throw new Error('opentype.js is not loaded or parse function is missing.');
    }

    const parsedFont = opentype.parse(processedBuffer) as OpentypeFontLike;
    return parsedFont;
  } catch (parseError) {
    const message = parseError instanceof Error ? parseError.message : String(parseError);
    toast.error(`Ошибка анализа шрифта ${fontName}: ${message}`);
    console.error(`[Main] Font parsing/processing error for ${fontName}:`, parseError);
    return null;
  }
}

export type GlyphDataResult = {
  allGlyphs: unknown[];
  names?: unknown[];
  unicodes?: unknown[];
  advanceWidths?: unknown[];
  errors?: unknown[];
};

export const getGlyphDataForFont = async (
  fontObj: SessionFontRecord | null | undefined,
): Promise<GlyphDataResult | null> => {
  if (!fontObj || !fontObj.file) {
    console.error('getGlyphDataForFont: Invalid fontObj or missing file.');
    return null;
  }

  const fontId = fontObj.id || fontObj.name;

  try {
    const buffer = await fontObj.file.arrayBuffer();
    if (!buffer || buffer.byteLength === 0) {
      console.error(`[fontParser] Font file buffer is empty for ${fontObj.name}`);
      throw new Error('Font file buffer is empty.');
    }

    const font = await parseFontBuffer(buffer, fontObj.name || 'font');
    if (!font) {
      console.error(`[fontParser] Main thread: Failed to parse font buffer for ${fontObj.name}`);
      throw new Error('Ошибка при парсинге шрифта в основном потоке');
    }

    const resultData = extractBasicGlyphData(font as GlyphOpentypeFont, 'main') as GlyphDataResult | null;

    if (!resultData) {
      console.error(
        `[fontParser] Main thread: extractBasicGlyphData returned null for ${fontObj.name}.`,
      );
      throw new Error('Ошибка при извлечении данных глифов в основном потоке');
    }

    if (resultData.errors && resultData.errors.length > 0) {
      console.warn(
        `[fontParser - main] Found ${resultData.errors.length} errors processing glyphs for ${fontObj.name}.`,
      );
    }

    if (!resultData || !Array.isArray(resultData.allGlyphs)) {
      console.error(
        `[fontParser - main] Final glyph data result is invalid for ${fontObj.name}`,
        resultData,
      );
      return null;
    }

    return resultData;
  } catch (error) {
    console.error(`[fontParser] Error in getGlyphDataForFont for ${fontId}:`, error);
    return null;
  }
};
