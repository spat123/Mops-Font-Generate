// Утилиты для конвертации цветовых форматов

export type RgbTuple = [number, number, number];
export type HsvTuple = [number, number, number];

export const hsvToRgb = (h: number, s: number, v: number): RgbTuple => {
  let hue = h % 360;
  if (hue < 0) hue += 360;

  let hNorm = hue / 60;
  const sNorm = s > 1 ? s / 100 : s;
  const vNorm = v > 1 ? v / 100 : v;

  const f = hNorm - Math.floor(hNorm);
  const p = vNorm * (1 - sNorm);
  const q = vNorm * (1 - f * sNorm);
  const t = vNorm * (1 - (1 - f) * sNorm);

  let r: number;
  let g: number;
  let b: number;

  switch (Math.floor(hNorm)) {
    case 0:
      r = vNorm;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = vNorm;
      b = p;
      break;
    case 2:
      r = p;
      g = vNorm;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = vNorm;
      break;
    case 4:
      r = t;
      g = p;
      b = vNorm;
      break;
    case 5:
      r = vNorm;
      g = p;
      b = q;
      break;
    default:
      r = vNorm;
      g = t;
      b = p;
      break;
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  const rr = Math.max(0, Math.min(255, Math.round(r)));
  const gg = Math.max(0, Math.min(255, Math.round(g)));
  const bb = Math.max(0, Math.min(255, Math.round(b)));

  return (
    '#' +
    [rr, gg, bb]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
};

export const hexToHsv = (hex: string): HsvTuple => {
  if (!hex || typeof hex !== 'string' || !/^#[0-9A-Fa-f]{3,6}$/.test(hex)) {
    console.error('Invalid HEX color format:', hex);
    return [0, 0, 0];
  }

  let r = 0;
  let g = 0;
  let b = 0;

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

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    console.error('Invalid RGB values from HEX:', hex, [r, g, b]);
    return [0, 0, 0];
  }

  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h: number;
  const v = max;

  const d = max - min;
  const s = max === 0 ? 0 : d / max;

  if (max === min) {
    h = 0;
  } else {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      default:
        h = 0;
        break;
    }
    h /= 6;
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(v * 100)];
};

export const hexToRgbString = (hex: string): string => {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
    return 'rgb(0, 0, 0)';
  }

  let r = 0;
  let g = 0;
  let b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    console.error('Invalid RGB values from HEX for string conversion:', hex, [r, g, b]);
    return 'rgb(0, 0, 0)';
  }

  return `rgb(${r}, ${g}, ${b})`;
};

export const hexToRgbComponents = (hex: string): { r: number; g: number; b: number } => {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
    return { r: 0, g: 0, b: 0 };
  }
  let r = 0;
  let g = 0;
  let b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return { r: 0, g: 0, b: 0 };
  }
  return { r, g, b };
};

export const rgbStringToHex = (rgb: string): string => {
  const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!match) return '#000000';

  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    console.error('Invalid RGB values in string:', rgb);
    return '#000000';
  }

  return rgbToHex(r, g, b);
};
