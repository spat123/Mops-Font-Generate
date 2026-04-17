// Функции для парсинга файлов шрифтов с использованием opentype.js
import opentype from 'opentype.js'; // Оставляем стандартный импорт
import { toast } from 'react-toastify'; // toast используется в parseFontFile
import { extractBasicGlyphData } from './glyphUtils';

// --- ИМПОРТИРУЕМ ДЕКОМПРЕССОР ИЗ НОВОГО ПАКЕТА ---
import decompress from 'woff2-encoder/decompress';

// <<< ЛОГ ПРОВЕРКИ OPENTYPE.JS >>>
try {
  console.log('[Main] opentype.js status:', typeof opentype, 'Version:', opentype?.version || 'N/A'); 
} catch (e) {
  console.error('[Main] Failed to access opentype object after import:', e);
}
// <<< КОНЕЦ ЛОГА ПРОВЕРКИ >>>

// <<< ЛОГ ПРОВЕРКИ ДЕКОМПРЕССОРА >>>
try {
  console.log('[Main] woff2-encoder/decompress status:', typeof decompress);
} catch (e) {
  console.error('[Main] Failed to access decompress function after import:', e);
}
// <<< КОНЕЦ ЛОГА ПРОВЕРКИ >>>

/**
 * Проверяет первые 4 байта буфера на сигнатуру WOFF2 ('wOF2')
 */
const isWoff2 = (buffer) => {
  if (!buffer || buffer.byteLength < 4) return false;
  if (!(buffer instanceof ArrayBuffer) && typeof buffer.slice !== 'function') return false; 
  try {
    const signature = String.fromCharCode(...new Uint8Array(buffer.slice(0, 4)));
    return signature === 'wOF2';
  } catch (e) {
     console.error("Error checking WOFF2 signature:", e);
      return false;
    }
  };
  
/**
 * Проверяет, является ли шрифт вариативным (содержит таблицу fvar).
 * @param {opentype.Font} fontData - Объект шрифта, полученный из opentype.parse.
 * @returns {boolean} - true, если шрифт вариативный, иначе false.
 */
export const isVariableFont = (fontData) => {
  return !!(fontData && fontData.tables && fontData.tables.fvar);
};

/** Тег оси в fvar → 4-символьная строка (opentype может отдавать string или массив байт). */
export function normalizeFvarAxisTag(tag) {
  if (tag == null) return '';
  if (typeof tag === 'string') {
    const t = tag.trim();
    return t.length <= 4 ? t : t.slice(0, 4);
  }
  if (Array.isArray(tag)) {
    return tag
      .map((c) => (typeof c === 'number' ? String.fromCharCode(c & 0xff) : typeof c === 'string' ? c : ''))
      .join('')
      .slice(0, 4);
  }
  return String(tag).slice(0, 4);
}

function axisDisplayName(axis, tag) {
  const n = axis?.name;
  if (n && typeof n === 'object' && n.en) return n.en;
  if (typeof n === 'string' && n.trim()) return n.trim();
  return String(tag).toUpperCase();
}

/**
 * У региональных woff2-слайсов Google VF часто урезанный fvar (например только wght).
 * Собираем объединение осей по всем слайсам: min/max по всем файлам; default и имя — из самого «полного» fvar.
 *
 * @param {Array<object|Blob|ArrayBuffer|null|undefined>} inputs — уже распарсенный Font opentype или бинарник слайса
 * @returns {Promise<Record<string, { name: string, min: number, max: number, default: number }>|null>}
 */
export async function mergeFvarAxesFromFontInputs(inputs) {
  if (!Array.isArray(inputs) || inputs.length === 0) return null;

  const parseBag = [];
  for (const inp of inputs) {
    if (!inp) continue;
    let parsed = null;
    if (typeof inp === 'object' && inp.tables && inp.tables.fvar && Array.isArray(inp.tables.fvar.axes)) {
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

  const merged = {};
  for (const { axes } of parseBag) {
    for (const axis of axes) {
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

  const richest = parseBag[0].axes;
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

/**
 * [Только основной поток] Асинхронно парсит ArrayBuffer шрифта.
 * Декомпрессирует WOFF2 при необходимости.
 * Возвращает полный объект opentype.Font или null при ошибке.
 *
 * @param {ArrayBuffer} buffer - ArrayBuffer с данными шрифта.
 * @param {string} [fontName='unknown'] - Имя шрифта для логирования.
 * @returns {Promise<opentype.Font|null>} Промис с объектом шрифта или null.
 */
export async function parseFontBuffer(buffer, fontName = 'unknown') {
  // Теперь эта функция просто вызывает _parseFontBufferDirect
    return _parseFontBufferDirect(buffer, fontName);
}

/**
 * [Только основной поток] Асинхронно парсит ArrayBuffer файла шрифта с помощью opentype.js
 * Декомпрессирует WOFF2 с помощью woff2-encoder.
 * @param {ArrayBuffer} buffer - Буфер с данными файла шрифта
 * @param {string} fontName - Имя шрифта (для сообщений об ошибках)
 * @returns {Promise<opentype.Font|null>} - Промис с объектом fontData от opentype.js или null в случае ошибки
 */
export const _parseFontBufferDirect = async (buffer, fontName = 'font') => {
  if (!buffer || !(buffer instanceof ArrayBuffer) || buffer.byteLength === 0) {
    console.error(`[${fontName}] Invalid or empty buffer provided for direct parsing.`);
    return null;
  }
  
  let processedBuffer = buffer;
  
  try {
     if (isWoff2(buffer)) {
         console.log(`[Main] Detected WOFF2 for ${fontName}, attempting decompression with woff2-encoder...`);
         try {
             if (typeof decompress !== 'function') {
                 throw new Error('woff2-encoder decompress function is not available. Check import.');
             }
             const decompressedData = await decompress(new Uint8Array(buffer)); 
             if (!decompressedData) {
                 throw new Error('woff2-encoder decompression returned null or undefined.');
             }
             processedBuffer = decompressedData.buffer;
             console.log(`[Main] WOFF2 decompression successful for ${fontName}`);
         } catch (decompError) {
             toast.error(`Ошибка декомпрессии WOFF2 для ${fontName}: ${decompError.message}`);
             console.error(`[Main] WOFF2 decompression failed for ${fontName}:`, decompError);
             return null; 
         }
     }
     
    if (typeof opentype === 'undefined' || typeof opentype.parse !== 'function') {
        throw new Error('opentype.js is not loaded or parse function is missing.');
    }
     
    const parsedFont = opentype.parse(processedBuffer);
    console.log(`[Main] Parsed ${fontName} successfully.`);
    return parsedFont;
    
  } catch (parseError) {
    toast.error(`Ошибка анализа шрифта ${fontName}: ${parseError.message}`);
    console.error(`[Main] Font parsing/processing error for ${fontName}:`, parseError);
    return null;
  }
};

/**
 * [Только основной поток] Читает файл шрифта (Blob) и парсит его.
 */
export const _parseFontFileDirect = (file, fontName = 'font') => {
  return new Promise((resolve) => { 
    if (!(file instanceof Blob)) {
      toast.error(`Недопустимый файл шрифта для ${fontName} (ожидается Blob)`);
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target.result;
        // Вызываем парсер основного потока
        const parsedFont = await _parseFontBufferDirect(buffer, fontName);
        resolve(parsedFont);
      } catch (error) {
         console.error('Unexpected error during font buffer processing (direct):', error);
         resolve(null);
      }
    };
    reader.onerror = (error) => {
      toast.error(`Ошибка при чтении файла шрифта ${fontName}`);
      console.error(`FileReader error for ${fontName}:`, error);
      resolve(null);
    };

    try {
      reader.readAsArrayBuffer(file);
    } catch (readError) {
        toast.error(`Не удалось начать чтение файла ${fontName}`);
        console.error(`Error calling readAsArrayBuffer for ${fontName}:`, readError);
        resolve(null);
    }
  });
};

/**
 * [Только основной поток] Получает данные глифов для шрифта.
 * @param {Object} fontObj - Объект шрифта
 * @returns {Promise<Object|null>} - Промис с данными глифов или null.
 */
export const getGlyphDataForFont = async (fontObj) => {
  if (!fontObj || !fontObj.file) {
    console.error('getGlyphDataForFont: Invalid fontObj or missing file.');
    return null;
  }
  
  const fontId = fontObj.id || fontObj.name;

  try {
    // Получаем ArrayBuffer
    const buffer = await fontObj.file.arrayBuffer();
    if (!buffer || buffer.byteLength === 0) {
      console.error(`[fontParser] Font file buffer is empty for ${fontObj.name}`);
      throw new Error("Font file buffer is empty.");
    }

    // --- Используем только основной поток --- 
    console.log(`[fontParser] Processing glyphs in main thread for ${fontObj.name}`);
    
    // Парсим буфер в основном потоке
    const font = await parseFontBuffer(buffer, fontObj.name); // parseFontBuffer теперь вызывает _parseFontBufferDirect
        if (!font) {
            console.error(`[fontParser] Main thread: Failed to parse font buffer for ${fontObj.name}`);
            throw new Error('Ошибка при парсинге шрифта в основном потоке');
        }

    // Извлекаем глифы
    const resultData = extractBasicGlyphData(font, 'main');

        if (!resultData) {
          console.error(`[fontParser] Main thread: extractBasicGlyphData returned null for ${fontObj.name}.`);
          throw new Error('Ошибка при извлечении данных глифов в основном потоке');
        }
    // --- Конец использования основного потока --- 
      
    // Логируем ошибки, если они были
      if (resultData.errors && resultData.errors.length > 0) {
      console.warn(`[fontParser - main] Found ${resultData.errors.length} errors processing glyphs for ${fontObj.name}.`);
      }

      // Проверяем итоговый результат перед возвратом
      if (!resultData || !Array.isArray(resultData.allGlyphs)) {
        console.error(`[fontParser - main] Final glyph data result is invalid for ${fontObj.name}`, resultData);
        return null; 
      }

    return resultData; // Возвращаем { allGlyphs, names, unicodes, advanceWidths, errors }

  } catch (error) {
    console.error(`[fontParser] Error in getGlyphDataForFont for ${fontId}:`, error);
    // toast.error('Ошибка при загрузке данных о глифах'); // Можно раскомментировать, если нужно
    return null; // Возвращаем null при критической ошибке
  }
}; 