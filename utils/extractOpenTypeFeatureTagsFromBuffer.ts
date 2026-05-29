import opentype from 'opentype.js';
import decompress from 'woff2-encoder/decompress';

export type OpenTypeFeatureTag = string;

export type OpenTypeFeatureTagReport = {
  /** Уникальные теги фич (из GSUB + GPOS), отсортированные. */
  tags: OpenTypeFeatureTag[];
  /** Откуда пришло (для отладки/UI). */
  gsubTags: OpenTypeFeatureTag[];
  gposTags: OpenTypeFeatureTag[];
};

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

function normalizeFeatureTag(raw: unknown): string {
  const t = String(raw ?? '').trim();
  if (!t) return '';
  // OpenType tags always 4 chars, но в парсере может прилетать "calt" и т.п.
  return t.slice(0, 4).toLowerCase();
}

function extractTagsFromTable(table: unknown): OpenTypeFeatureTag[] {
  const anyTable = table as any;
  const features = anyTable?.features;
  if (!Array.isArray(features) || features.length === 0) return [];
  const out: string[] = [];
  for (const f of features) {
    const tag = normalizeFeatureTag((f as any)?.tag);
    if (tag) out.push(tag);
  }
  return out;
}

function uniqSorted(tags: string[]): string[] {
  return [...new Set(tags.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export async function extractOpenTypeFeatureTagsFromBuffer(
  fontBuffer: ArrayBuffer | ArrayBufferView | Buffer,
): Promise<OpenTypeFeatureTagReport | null> {
  try {
    let buf = await toArrayBuffer(fontBuffer);
    if (isWoff2(buf)) {
      const dec = await decompress(new Uint8Array(buf));
      if (dec?.buffer) buf = dec.buffer as ArrayBuffer;
    }

    const font = opentype.parse(buf) as any;
    const gsubTags = uniqSorted(extractTagsFromTable(font?.tables?.gsub));
    const gposTags = uniqSorted(extractTagsFromTable(font?.tables?.gpos));
    const tags = uniqSorted([...gsubTags, ...gposTags]);
    if (tags.length === 0) return null;
    return { tags, gsubTags, gposTags };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn('[extractOpenTypeFeatureTagsFromBuffer]', message);
    return null;
  }
}

