// Функции для работы с глифами, лигатурами, альтернативными символами шрифта
// import { getCharUnicode } from './fontUtilsCommon'; // Удаляем этот лишний импорт

// Вспомогательные функции для работы с глифами и структурами opentype.js

// --- НОВАЯ ОБЩАЯ ФУНКЦИЯ ---
/**
 * Извлекает базовые данные глифов из объекта шрифта opentype.js
 * Эта функция будет использоваться как в основном потоке (fallback), так и в веб-воркере.
 * 
 * @param {object} font - Распарсенный объект шрифта opentype.js
 * @param {string} [source='unknown'] - Источник вызова ('worker' или 'main') для логирования
 * @returns {object|null} - Объект с данными глифов: { allGlyphs: Array, names: Object, unicodes: Object, advanceWidths: Object, errors: Array }
 *                   или null в случае ошибки.
 */
export const extractBasicGlyphData = (font, source = 'unknown') => {
  if (!font || !font.glyphs || typeof font.glyphs.get !== 'function') {
    console.error(`[extractBasicGlyphData - ${source}] Invalid font object provided.`);
    return null;
  }

  const allGlyphs = [];
  const glyphNames = {};
  const glyphUnicodes = {};
  const advanceWidths = {};
  const errors = []; // Собираем ошибки
  const numGlyphs = font.numGlyphs;

  // console.log(`[extractBasicGlyphData - ${source}] Processing ${numGlyphs} glyphs.`);

  for (let i = 0; i < numGlyphs; i++) {
    try {
      const glyph = font.glyphs.get(i);

      // Пропускаем невалидные глифы и .notdef
      if (!glyph || glyph.name === '.notdef') {
        continue;
      }

      // Основная информация
      const glyphInfo = {
        id: glyph.index, 
        name: glyph.name || `glyph_${glyph.index}`,
        unicode: glyph.unicode || null,
        unicodes: glyph.unicodes || [],
        advanceWidth: Math.round(glyph.advanceWidth) || 0,
      };

      allGlyphs.push(glyphInfo);

      // Сохраняем имя и Unicode для быстрого доступа
      glyphNames[glyphInfo.id] = glyphInfo.name;
      if (glyphInfo.unicode) {
        glyphUnicodes[glyphInfo.id] = `U+${glyphInfo.unicode.toString(16).toUpperCase().padStart(4, '0')}`;
      }
      advanceWidths[glyphInfo.id] = glyphInfo.advanceWidth;

    } catch (glyphError) {
      // Логируем ошибку обработки конкретного глифа
      console.warn(`[extractBasicGlyphData - ${source}] Error processing glyph index ${i}:`, glyphError);
      errors.push({ index: i, message: glyphError.message }); // Сохраняем ошибку
    }
  }

  // console.log(`[extractBasicGlyphData - ${source}] Successfully extracted ${allGlyphs.length} glyphs.`);

  return {
    allGlyphs: allGlyphs,
    names: glyphNames,
    unicodes: glyphUnicodes,
    advanceWidths: advanceWidths,
    errors: errors // Возвращаем ошибки
  };
};
// --- КОНЕЦ НОВОЙ ОБЩЕЙ ФУНКЦИИ ---

/**
 * Получает имя глифа из шрифта с помощью opentype.js
 * @param {Object} font - Объект шрифта из opentype.js
 * @param {string} char - Символ для поиска имени глифа
 * @returns {string|null} - Имя глифа из шрифта или null, если не найдено или ошибка
 */
export const getGlyphNameFromFont = (font, char) => {
  if (!font || typeof font.charToGlyph !== 'function' || !char || typeof char !== 'string') {
    return null;
  }

  try {
    const glyph = font.charToGlyph(char);
    return glyph ? glyph.name : null;
  } catch (error) {
    // console.error(`Error getting glyph name for char "${char}":`, error);
    return null;
  }
};

/**
 * Получает упрощенное название символа
 * @param {string} char - Символ для получения названия
 * @returns {string} - Упрощенное название символа
 */
export const getSimpleCharName = (char) => {
  if (!char || typeof char !== 'string' || !char.length) {
    return 'unknown';
  }

  // Используем специальный словарь для латинских букв
  const latinNames = {
    'a': 'a (lowercase)', 'b': 'b (lowercase)', 'c': 'c (lowercase)', 'd': 'd (lowercase)',
    'e': 'e (lowercase)', 'f': 'f (lowercase)', 'g': 'g (lowercase)', 'h': 'h (lowercase)',
    'i': 'i (lowercase)', 'j': 'j (lowercase)', 'k': 'k (lowercase)', 'l': 'l (lowercase)',
    'm': 'm (lowercase)', 'n': 'n (lowercase)', 'o': 'o (lowercase)', 'p': 'p (lowercase)',
    'q': 'q (lowercase)', 'r': 'r (lowercase)', 's': 's (lowercase)', 't': 't (lowercase)',
    'u': 'u (lowercase)', 'v': 'v (lowercase)', 'w': 'w (lowercase)', 'x': 'x (lowercase)',
    'y': 'y (lowercase)', 'z': 'z (lowercase)',
    'A': 'A (uppercase)', 'B': 'B (uppercase)', 'C': 'C (uppercase)', 'D': 'D (uppercase)',
    'E': 'E (uppercase)', 'F': 'F (uppercase)', 'G': 'G (uppercase)', 'H': 'H (uppercase)',
    'I': 'I (uppercase)', 'J': 'J (uppercase)', 'K': 'K (uppercase)', 'L': 'L (uppercase)',
    'M': 'M (uppercase)', 'N': 'N (uppercase)', 'O': 'O (uppercase)', 'P': 'P (uppercase)',
    'Q': 'Q (uppercase)', 'R': 'R (uppercase)', 'S': 'S (uppercase)', 'T': 'T (uppercase)',
    'U': 'U (uppercase)', 'V': 'V (uppercase)', 'W': 'W (uppercase)', 'X': 'X (uppercase)',
    'Y': 'Y (uppercase)', 'Z': 'Z (uppercase)',
    '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
    '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
    '.': 'period', ',': 'comma', ':': 'colon', ';': 'semicolon', '-': 'hyphen', '_': 'underscore',
    '!': 'exclamation', '?': 'question', '"': 'quotation mark', "'": 'apostrophe',
    '(': 'left parenthesis', ')': 'right parenthesis', '[': 'left bracket', ']': 'right bracket',
    '{': 'left brace', '}': 'right brace', '/': 'slash', '\\': 'backslash', '|': 'vertical bar',
    '@': 'at sign', '#': 'number sign', '$': 'dollar sign', '%': 'percent', '^': 'caret',
    '&': 'ampersand', '*': 'asterisk', '+': 'plus', '=': 'equals', '<': 'less than', '>': 'greater than',
    '~': 'tilde', '`': 'grave accent', '№': 'numero', '€': 'euro sign', '£': 'pound sign',
    '¥': 'yen sign', '©': 'copyright', '®': 'registered', '™': 'trademark', '°': 'degree',
    '±': 'plus-minus', '×': 'multiply', '÷': 'divide', '≠': 'not equal', '≈': 'approximately equal',
    ' ': 'space'
  };

  // Используем словарь для кириллицы
  const cyrillicNames = {
    'А': 'А (заглавная)', 'Б': 'Б (заглавная)', 'В': 'В (заглавная)', 'Г': 'Г (заглавная)',
    'Д': 'Д (заглавная)', 'Е': 'Е (заглавная)', 'Ё': 'Ё (заглавная)', 'Ж': 'Ж (заглавная)',
    'З': 'З (заглавная)', 'И': 'И (заглавная)', 'Й': 'Й (заглавная)', 'К': 'К (заглавная)',
    'Л': 'Л (заглавная)', 'М': 'М (заглавная)', 'Н': 'Н (заглавная)', 'О': 'О (заглавная)',
    'П': 'П (заглавная)', 'Р': 'Р (заглавная)', 'С': 'С (заглавная)', 'Т': 'Т (заглавная)',
    'У': 'У (заглавная)', 'Ф': 'Ф (заглавная)', 'Х': 'Х (заглавная)', 'Ц': 'Ц (заглавная)',
    'Ч': 'Ч (заглавная)', 'Ш': 'Ш (заглавная)', 'Щ': 'Щ (заглавная)', 'Ъ': 'Ъ (заглавная)',
    'Ы': 'Ы (заглавная)', 'Ь': 'Ь (заглавная)', 'Э': 'Э (заглавная)', 'Ю': 'Ю (заглавная)',
    'Я': 'Я (заглавная)',
    'а': 'а (строчная)', 'б': 'б (строчная)', 'в': 'в (строчная)', 'г': 'г (строчная)',
    'д': 'д (строчная)', 'е': 'е (строчная)', 'ё': 'ё (строчная)', 'ж': 'ж (строчная)',
    'з': 'з (строчная)', 'и': 'и (строчная)', 'й': 'й (строчная)', 'к': 'к (строчная)',
    'л': 'л (строчная)', 'м': 'м (строчная)', 'н': 'н (строчная)', 'о': 'о (строчная)',
    'п': 'п (строчная)', 'р': 'р (строчная)', 'с': 'с (строчная)', 'т': 'т (строчная)',
    'у': 'у (строчная)', 'ф': 'ф (строчная)', 'х': 'х (строчная)', 'ц': 'ц (строчная)',
    'ч': 'ч (строчная)', 'ш': 'ш (строчная)', 'щ': 'щ (строчная)', 'ъ': 'ъ (строчная)',
    'ы': 'ы (строчная)', 'ь': 'ь (строчная)', 'э': 'э (строчная)', 'ю': 'ю (строчная)',
    'я': 'я (строчная)'
  };

  // Сначала проверяем в словарях
  if (latinNames[char]) return latinNames[char];
  if (cyrillicNames[char]) return cyrillicNames[char];

  // Если не нашли, пытаемся определить категорию символа по Unicode блоку
  try {
    const code = char.codePointAt(0);
    if (isNaN(code)) return 'unknown';

    if (code >= 0x2600 && code <= 0x26FF) return 'Miscellaneous Symbols';
    if (code >= 0x2700 && code <= 0x27BF) return 'Dingbats';
    if (code >= 0x1F300 && code <= 0x1F5FF) return 'Miscellaneous Symbols and Pictographs';
    if (code >= 0x1F600 && code <= 0x1F64F) return 'Emoticons';
    if (code >= 0x1F680 && code <= 0x1F6FF) return 'Transport and Map Symbols';
    if (code >= 0x1F700 && code <= 0x1F77F) return 'Alchemical Symbols';
    // Добавить другие блоки по необходимости

  } catch (error) {
    // Ошибка при получении codePoint (например, для суррогатных пар)
    return 'unknown';
  }

  // Если не смогли классифицировать, возвращаем generic name
  return 'character';
};

/**
 * Получает все доступные глифы из шрифта
 * @param {Object} font - Объект шрифта из opentype.js
 * @returns {Array<{character: string, unicode: string, name: string, index: number}>} - Массив объектов глифов
 */
export const getAllGlyphsFromFont = (font) => {
  if (!font || !font.glyphs || typeof font.glyphs.get !== 'function' || typeof font.numGlyphs !== 'number') {
    return [];
  }

  try {
    const glyphs = [];
    const numGlyphs = font.numGlyphs;

    for (let i = 0; i < numGlyphs; i++) {
      const glyph = font.glyphs.get(i);

      // Пропускаем .notdef и глифы без Unicode
      if (!glyph || glyph.name === '.notdef' || !glyph.unicode) continue;

      // Получаем символ (может быть несколько Unicode для одного глифа)
      // Берем первый Unicode для простоты
      const charCode = glyph.unicode;
      const char = String.fromCodePoint(charCode);

      // Добавляем только уникальные символы (не глифы)
      if (!glyphs.some(g => g.character === char)) {
         glyphs.push({
           character: char,
           unicode: getCharUnicode(char),
           name: glyph.name || '',
           index: i // Сохраняем индекс глифа
         });
      }
    }

    // Можно добавить сортировку по Unicode
    glyphs.sort((a, b) => a.unicode.localeCompare(b.unicode));

    return glyphs;
  } catch (error) {
    console.error('Error getting all glyphs from font:', error);
    return [];
  }
};

/**
 * Получает альтернативные формы глифа (если они есть в шрифте)
 * Реализация требует глубокого понимания таблицы GSUB 'aalt' и других фич.
 * Эта функция является заглушкой или требует значительной доработки.
 * @param {Object} font - Объект шрифта из opentype.js
 * @param {string} char - Символ для поиска альтернативных форм
 * @returns {Array<{name: string, unicode: string, index: number}>} - Массив объектов альтернативных глифов
 */
export const getGlyphAlternatives = (font, char) => {
  if (!font || !char || !font.tables || !font.tables.gsub || !font.glyphs) return [];

  try {
    const alternatives = [];
    const mainGlyph = font.charToGlyph(char);
    if (!mainGlyph || !mainGlyph.index) return [];

    const mainGlyphIndex = mainGlyph.index;
    const gsub = font.tables.gsub;

    // Поиск альтернатив в таблицах GSUB (упрощенный пример для lookupType 3)
    if (gsub.lookups) {
        for (const lookup of gsub.lookups) {
            // LookupType 3: Alternate Substitution Subtable
            if (lookup.lookupType === 3) {
                for (const subtable of lookup.subtables) {
                    if (subtable.coverage && subtable.coverage.glyphs) {
                        const coverageIndex = subtable.coverage.glyphs.indexOf(mainGlyphIndex);
                        if (coverageIndex !== -1 && subtable.alternateSets && subtable.alternateSets[coverageIndex]) {
                            const alternateIndices = subtable.alternateSets[coverageIndex];
                            alternateIndices.forEach(altIndex => {
                                const altGlyph = font.glyphs.get(altIndex);
                                if (altGlyph) {
                                     alternatives.push({
                                       name: altGlyph.name || '',
                                       unicode: altGlyph.unicode ? getCharUnicode(String.fromCodePoint(altGlyph.unicode)) : '' ,
                                       index: altIndex
                                     });
                                }
                            });
                        }
                    }
                }
            }
             // Можно добавить поддержку других lookupTypes (e.g., lookupType 1)
        }
    }

    // Удаляем дубликаты и основной глиф из альтернатив
    const uniqueAlternatives = alternatives.filter((alt, index, self) =>
        alt.index !== mainGlyphIndex &&
        index === self.findIndex((t) => t.index === alt.index)
    );

    return uniqueAlternatives;
  } catch (error) {
    console.error('Error getting glyph alternatives:', error);
    return [];
  }
};

/**
 * Получает лигатуры для последовательности символов (если они есть в шрифте)
 * Реализация требует глубокого понимания таблицы GSUB 'liga', 'clig' и др.
 * Эта функция является заглушкой или требует значительной доработки.
 * @param {Object} font - Объект шрифта из opentype.js
 * @param {string} chars - Последовательность символов для поиска лигатур
 * @returns {Array<{original: string, ligature: string, unicode: string}>} - Массив объектов лигатур
 */
export const getLigatures = (font, chars) => {
  if (!font || !chars || chars.length < 2 || !font.tables || !font.tables.gsub) return [];

  try {
    const ligatures = [];
    // const gsub = font.tables.gsub;

    // TODO: Реализовать сложную логику поиска лигатур в GSUB таблицах (lookupType 4)
    // Это требует рекурсивного обхода или сложного сопоставления последовательностей глифов.

    // Добавляем базовые лигатуры для распространенных сочетаний как запасной вариант
    const commonLigatures = {
      'ff': 'ﬀ',
      'fi': 'ﬁ',
      'fl': 'ﬂ',
      'ffi': 'ﬃ',
      'ffl': 'ﬄ'
    };

    if (commonLigatures[chars]) {
        const ligChar = commonLigatures[chars];
        ligatures.push({
            original: chars,
            ligature: ligChar,
            unicode: getCharUnicode(ligChar)
        });
    }

    return ligatures;
  } catch (error) {
    console.error('Error getting ligatures:', error);
    return [];
  }
};

// Добавляем функцию getCharUnicode, перенесенную из fontUtilsCommon.js
/**
 * Получает Unicode-код символа в формате "U+XXXX"
 * @param {string} char - Символ для получения Unicode
 * @returns {string} - Unicode-код в формате "U+XXXX"
 */
export const getCharUnicode = (char) => {
  if (!char || typeof char !== 'string' || !char.length) {
    return 'U+????';
  }

  try {
    const codePoint = char.codePointAt(0);
    // Проверка на NaN, чтобы избежать "U+NAN"
    if (isNaN(codePoint)) {
        return 'U+????';
    }
    return `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
  } catch (error) {
    return 'U+????';
  }
}; 