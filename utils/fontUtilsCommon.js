// Общие вспомогательные функции для работы со шрифтами

// Константы пресетов стилей
export const PRESET_STYLES = [
  { name: 'Thin', weight: 100, style: 'normal' },
  { name: 'ExtraLight', weight: 200, style: 'normal' },
  { name: 'Light', weight: 300, style: 'normal' },
  { name: 'Regular', weight: 400, style: 'normal' },
  { name: 'Medium', weight: 500, style: 'normal' },
  { name: 'SemiBold', weight: 600, style: 'normal' },
  { name: 'Bold', weight: 700, style: 'normal' },
  { name: 'ExtraBold', weight: 800, style: 'normal' },
  { name: 'Black', weight: 900, style: 'normal' },
  // { name: 'ExtraBlack', weight: 1000, style: 'normal' }, // Редко используется
  { name: 'Thin Italic', weight: 100, style: 'italic' },
  { name: 'ExtraLight Italic', weight: 200, style: 'italic' },
  { name: 'Light Italic', weight: 300, style: 'italic' },
  { name: 'Italic', weight: 400, style: 'italic' },
  { name: 'Medium Italic', weight: 500, style: 'italic' },
  { name: 'SemiBold Italic', weight: 600, style: 'italic' },
  { name: 'Bold Italic', weight: 700, style: 'italic' },
  { name: 'ExtraBold Italic', weight: 800, style: 'italic' },
  { name: 'Black Italic', weight: 900, style: 'italic' },
  // { name: 'ExtraBlack Italic', weight: 1000, style: 'italic' }
];

/**
 * Находит информацию о стиле по весу и типу шрифта
 * @param {number} weight - Вес шрифта (100-900)
 * @param {string} style - Стиль шрифта ('normal', 'italic')
 * @returns {Object} - Объект с информацией о стиле (имя, вес, стиль)
 */
export const findStyleInfoByWeightAndStyle = (weight, style) => {
  // Нормализуем вес для поиска
  if (!weight) weight = 400;
  if (!style) style = 'normal';

  // Ищем соответствие стилю и весу
  switch (true) {
    case weight <= 100 && style === 'normal':
      return { name: 'Thin', weight: 100, style: 'normal' };
    case weight <= 100 && style === 'italic':
      return { name: 'Thin Italic', weight: 100, style: 'italic' };
    case weight <= 200 && style === 'normal':
      return { name: 'ExtraLight', weight: 200, style: 'normal' };
    case weight <= 200 && style === 'italic':
      return { name: 'ExtraLight Italic', weight: 200, style: 'italic' };
    case weight <= 300 && style === 'normal':
      return { name: 'Light', weight: 300, style: 'normal' };
    case weight <= 300 && style === 'italic':
      return { name: 'Light Italic', weight: 300, style: 'italic' };
    case weight <= 400 && style === 'normal':
      return { name: 'Regular', weight: 400, style: 'normal' };
    case weight <= 400 && style === 'italic':
      return { name: 'Italic', weight: 400, style: 'italic' };
    case weight <= 500 && style === 'normal':
      return { name: 'Medium', weight: 500, style: 'normal' };
    case weight <= 500 && style === 'italic':
      return { name: 'Medium Italic', weight: 500, style: 'italic' };
    case weight <= 600 && style === 'normal':
      return { name: 'SemiBold', weight: 600, style: 'normal' };
    case weight <= 600 && style === 'italic':
      return { name: 'SemiBold Italic', weight: 600, style: 'italic' };
    case weight <= 700 && style === 'normal':
      return { name: 'Bold', weight: 700, style: 'normal' };
    case weight <= 700 && style === 'italic':
      return { name: 'Bold Italic', weight: 700, style: 'italic' };
    case weight <= 800 && style === 'normal':
      return { name: 'ExtraBold', weight: 800, style: 'normal' };
    case weight <= 800 && style === 'italic':
      return { name: 'ExtraBold Italic', weight: 800, style: 'italic' };
    case weight <= 900 && style === 'normal':
      return { name: 'Black', weight: 900, style: 'normal' };
    case weight <= 900 && style === 'italic':
      return { name: 'Black Italic', weight: 900, style: 'italic' };
    default:
      return { name: 'Regular', weight: 400, style: 'normal' };
  }
};

/**
 * Определяет формат шрифта на основе расширения файла
 * @param {string} fileName - Имя файла шрифта
 * @returns {string} - Формат шрифта для @font-face
 */
export const getFormatFromExtension = (fileName) => {
  const extension = fileName?.toLowerCase().split('.').pop() || '';
  switch (extension) {
    case 'ttf':
      return 'truetype';
    case 'otf':
      return 'opentype';
    case 'woff':
      return 'woff';
    case 'woff2':
      return 'woff2';
    default:
      // Попытка вернуть truetype по умолчанию, если расширение неизвестно, но есть
      return extension ? 'truetype' : '';
  }
};

/**
 * Получает читаемое имя для тега оси вариативного шрифта
 * @param {string} tag - Тег оси (например, 'wght', 'wdth')
 * @returns {string} - Читаемое имя (например, 'Weight', 'Width')
 */
export const getAxisName = (tag) => {
  // ... (остальной код)
}; 