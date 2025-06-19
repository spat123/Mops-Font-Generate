// Утилиты для конвертации цветовых форматов

// Функция для конвертации HSV в RGB
export const hsvToRgb = (h, s, v) => {
  // Нормализуем значение H
  h = h % 360;
  if (h < 0) h += 360;

  // Переводим в диапазон 0-1
  h = h / 60;
  // Нормализуем s и v в диапазон 0-1, если они пришли как 0-100
  s = s > 1 ? s / 100 : s;
  v = v > 1 ? v / 100 : v;

  let f = h - Math.floor(h);
  let p = v * (1 - s);
  let q = v * (1 - f * s);
  let t = v * (1 - (1 - f) * s);

  let r, g, b;

  switch (Math.floor(h)) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
    default: r = v; g = t; b = p; break;
  }

  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255)
  ];
};

// Функция для конвертации RGB в HEX
export const rgbToHex = (r, g, b) => {
  // Убедимся, что значения находятся в диапазоне 0-255
  r = Math.max(0, Math.min(255, Math.round(r)));
  g = Math.max(0, Math.min(255, Math.round(g)));
  b = Math.max(0, Math.min(255, Math.round(b)));
  
  return '#' + [r, g, b]
    .map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    })
    .join('');
};

// Получаем HSV значения из HEX цвета
export const hexToHsv = (hex) => {
  // Проверяем валидность формата HEX
  if (!hex || typeof hex !== 'string' || !/^#[0-9A-Fa-f]{3,6}$/.test(hex)) {
    console.error('Invalid HEX color format:', hex);
    return [0, 0, 0]; // Возвращаем черный цвет по умолчанию [H, S, V]
  }

  // Конвертируем HEX в RGB
  let r = 0, g = 0, b = 0;

  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  } else {
    console.error('Unexpected HEX color length:', hex);
    return [0, 0, 0];
  }

  // Проверяем, что полученные значения являются числами
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    console.error('Invalid RGB values from HEX:', hex, [r, g, b]);
    return [0, 0, 0];
  }

  // Нормализация значений RGB
  r = r / 255;
  g = g / 255;
  b = b / 255;

  // Находим максимальное и минимальное значение из RGB
  let max = Math.max(r, g, b);
  let min = Math.min(r, g, b);
  let h, s, v = max;

  // Вычисление delta
  let d = max - min;
  s = max === 0 ? 0 : d / max;

  if (max === min) {
    h = 0; // оттенок не определен
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0; break; // Добавим default на всякий случай
    }
    h /= 6;
  }

  // Возвращаем HSV в формате [0-360, 0-100, 0-100]
  return [Math.round(h * 360), Math.round(s * 100), Math.round(v * 100)];
};

// Функция для преобразования HEX в RGB строку "rgb(r, g, b)"
export const hexToRgbString = (hex) => {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
    return 'rgb(0, 0, 0)';
  }

  // Получаем RGB компоненты
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }

   // Проверяем, что значения являются числами
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    console.error('Invalid RGB values from HEX for string conversion:', hex, [r, g, b]);
    return 'rgb(0, 0, 0)';
  }

  return `rgb(${r}, ${g}, ${b})`;
};

// Функция для преобразования RGB строки "rgb(r, g, b)" в HEX
export const rgbStringToHex = (rgb) => {
  // Получаем значения из rgb(r, g, b)
  const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!match) return '#000000';

  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);

  // Проверяем корректность значений
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    console.error('Invalid RGB values in string:', rgb);
    return '#000000';
  }
  
  return rgbToHex(r, g, b);
}; 