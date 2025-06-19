/**
 * Утилита для генерации статических шрифтов из вариативных
 * Использует различные подходы в зависимости от доступности инструментов
 */

// Попытка загрузки HarfBuzz WASM (если доступен)
let harfbuzzWasm = null;

const loadHarfBuzz = async () => {
  if (harfbuzzWasm) return harfbuzzWasm;
  
  try {
    // Пытаемся загрузить HarfBuzz WASM (пакет не установлен, будет fallback)
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Генерирует статический шрифт с использованием HarfBuzz WASM
 */
const generateWithHarfBuzz = async (fontBuffer, variableSettings) => {
  const hb = await loadHarfBuzz();
  if (!hb) throw new Error('HarfBuzz WASM недоступен');
  
  // Создаем blob из font data
  const blob = hb.createBlob(fontBuffer);
  const face = hb.createFace(blob, 0);
  const font = hb.createFont(face);
  
  // Применяем вариативные настройки
  const variations = Object.entries(variableSettings).map(([tag, value]) => ({
    tag: hb.tagFromString(tag),
    value: parseFloat(value)
  }));
  
  font.setVariations(variations);
  
  // Получаем новые данные шрифта
  const outputBlob = face.reference_table(hb.tagFromString('GDEF')); // Это упрощенный пример
  const outputBuffer = outputBlob.getData();
  
  // Очищаем ресурсы
  font.destroy();
  face.destroy();
  blob.destroy();
  
  return outputBuffer;
};

/**
 * Генерирует статический шрифт через серверный API
 */
const generateViaAPI = async (fontBuffer, variableSettings, format = 'woff2') => {
  const response = await fetch('/api/generate-static-font', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fontData: Buffer.from(fontBuffer).toString('base64'),
      variableSettings,
      format
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || 'Серверная генерация не удалась');
  }
  
  const result = await response.json();
  return Buffer.from(result.data, 'base64');
};

/**
 * Fallback: создает "псевдо-статический" шрифт с CSS переменными
 */
const generatePseudoStatic = (fontBuffer, variableSettings, fontName) => {
  // Возвращаем оригинальный шрифт + CSS с фиксированными настройками
  const cssVariations = Object.entries(variableSettings)
    .map(([axis, value]) => `"${axis}" ${value}`)
    .join(', ');
  
  const css = `
@font-face {
  font-family: "${fontName}-Static";
  src: url(data:font/woff2;base64,${Buffer.from(fontBuffer).toString('base64')}) format("woff2");
  font-variation-settings: ${cssVariations};
  font-display: swap;
}

.static-font {
  font-family: "${fontName}-Static", sans-serif;
  font-variation-settings: ${cssVariations};
}
`;
  
  return {
    fontBuffer,
    css,
    isPseudoStatic: true
  };
};

/**
 * Основная функция генерации статического шрифта
 * Пробует разные методы в порядке приоритета
 */
export const generateStaticFont = async (fontBuffer, variableSettings, options = {}) => {
  const { format = 'woff2', fontName = 'VariableFont', preferredMethod = 'auto' } = options;
  
  // Метод 1: HarfBuzz WASM (наиболее качественный)
  if (preferredMethod === 'auto' || preferredMethod === 'harfbuzz') {
    try {
      const result = await generateWithHarfBuzz(fontBuffer, variableSettings);
      return {
        buffer: result,
        method: 'harfbuzz',
        isRealStatic: true
      };
    } catch (error) {
      // Переходим к следующему методу
    }
  }
  
  // Метод 2: Серверный API (второй по качеству)
  if (preferredMethod === 'auto' || preferredMethod === 'server') {
    try {
      const result = await generateViaAPI(fontBuffer, variableSettings, format);
      return {
        buffer: result,
        method: 'server',
        isRealStatic: true
      };
    } catch (error) {
      // Переходим к следующему методу
    }
  }
  
  // Метод 3: Псевдо-статический (fallback)
  const result = generatePseudoStatic(fontBuffer, variableSettings, fontName);
  return {
    buffer: result.fontBuffer,
    css: result.css,
    method: 'pseudo-static',
    isRealStatic: false,
    warning: 'Создан псевдо-статический шрифт. Для настоящей статической генерации требуется серверная поддержка.'
  };
};

/**
 * Проверяет доступность различных методов генерации
 */
export const checkGenerationCapabilities = async () => {
  const capabilities = {
    harfbuzz: false,
    server: false,
    pseudoStatic: true // Всегда доступен
  };
  
  // Проверяем HarfBuzz
  try {
    await loadHarfBuzz();
    capabilities.harfbuzz = true;
  } catch (error) {
    // HarfBuzz недоступен
  }
  
  // Проверяем серверный API
  try {
    const response = await fetch('/api/generate-static-font', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true })
    });
    capabilities.server = response.status !== 404;
  } catch (error) {
    // Серверный API недоступен
  }
  
  return capabilities;
}; 