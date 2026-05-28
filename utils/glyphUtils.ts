export type GlyphInfo = {
  id: number;
  name: string;
  unicode: number | null;
  unicodes: number[];
  advanceWidth: number;
};

export type BasicGlyphData = {
  allGlyphs: GlyphInfo[];
  names: Record<number, string>;
  unicodes: Record<number, string>;
  advanceWidths: Record<number, number>;
  errors: Array<{ index: number; message: string }>;
};

export type OpentypeFontLike = {
  numGlyphs?: number;
  glyphs?: { get: (index: number) => {
    index: number;
    name?: string;
    unicode?: number;
    unicodes?: number[];
    advanceWidth?: number;
  } | null };
};

/**
 * Данные глифов из объекта opentype.js (основной поток / воркер).
 */
export function extractBasicGlyphData(
  font: OpentypeFontLike | null | undefined,
  source = 'unknown',
): BasicGlyphData | null {
  if (!font || !font.glyphs || typeof font.glyphs.get !== 'function') {
    console.error(`[extractBasicGlyphData - ${source}] Invalid font object provided.`);
    return null;
  }

  const allGlyphs: GlyphInfo[] = [];
  const glyphNames: Record<number, string> = {};
  const glyphUnicodes: Record<number, string> = {};
  const advanceWidths: Record<number, number> = {};
  const errors: Array<{ index: number; message: string }> = [];
  const numGlyphs = font.numGlyphs || 0;

  for (let i = 0; i < numGlyphs; i++) {
    try {
      const glyph = font.glyphs.get(i);

      if (!glyph || glyph.name === '.notdef') {
        continue;
      }

      const glyphInfo: GlyphInfo = {
        id: glyph.index,
        name: glyph.name || `glyph_${glyph.index}`,
        unicode: glyph.unicode ?? null,
        unicodes: glyph.unicodes || [],
        advanceWidth: Math.round(glyph.advanceWidth || 0) || 0,
      };

      allGlyphs.push(glyphInfo);

      glyphNames[glyphInfo.id] = glyphInfo.name;
      if (glyphInfo.unicode) {
        glyphUnicodes[glyphInfo.id] = `U+${glyphInfo.unicode.toString(16).toUpperCase().padStart(4, '0')}`;
      }
      advanceWidths[glyphInfo.id] = glyphInfo.advanceWidth;
    } catch (glyphError) {
      const message = glyphError instanceof Error ? glyphError.message : String(glyphError);
      console.warn(`[extractBasicGlyphData - ${source}] Error processing glyph index ${i}:`, glyphError);
      errors.push({ index: i, message });
    }
  }

  return {
    allGlyphs,
    names: glyphNames,
    unicodes: glyphUnicodes,
    advanceWidths,
    errors,
  };
}
