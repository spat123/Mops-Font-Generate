/**
 * Данные глифов из объекта opentype.js (основной поток / воркер).
 * @returns {{ allGlyphs: Array, names: Object, unicodes: Object, advanceWidths: Object, errors: Array }|null}
 */
export function extractBasicGlyphData(font, source = 'unknown') {
  if (!font || !font.glyphs || typeof font.glyphs.get !== 'function') {
    console.error(`[extractBasicGlyphData - ${source}] Invalid font object provided.`);
    return null;
  }

  const allGlyphs = [];
  const glyphNames = {};
  const glyphUnicodes = {};
  const advanceWidths = {};
  const errors = [];
  const numGlyphs = font.numGlyphs;

  for (let i = 0; i < numGlyphs; i++) {
    try {
      const glyph = font.glyphs.get(i);

      if (!glyph || glyph.name === '.notdef') {
        continue;
      }

      const glyphInfo = {
        id: glyph.index,
        name: glyph.name || `glyph_${glyph.index}`,
        unicode: glyph.unicode || null,
        unicodes: glyph.unicodes || [],
        advanceWidth: Math.round(glyph.advanceWidth) || 0,
      };

      allGlyphs.push(glyphInfo);

      glyphNames[glyphInfo.id] = glyphInfo.name;
      if (glyphInfo.unicode) {
        glyphUnicodes[glyphInfo.id] = `U+${glyphInfo.unicode.toString(16).toUpperCase().padStart(4, '0')}`;
      }
      advanceWidths[glyphInfo.id] = glyphInfo.advanceWidth;
    } catch (glyphError) {
      console.warn(`[extractBasicGlyphData - ${source}] Error processing glyph index ${i}:`, glyphError);
      errors.push({ index: i, message: glyphError.message });
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
