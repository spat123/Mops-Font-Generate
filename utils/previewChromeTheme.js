/**
 * Тема «хрома» превью (подписи, рамки) от фона: на тёмном фоне — светлый текст.
 * Учитывается прозрачность: rgba смешивается с белым подложки области превью (bg-white).
 */

function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}

/**
 * @returns {{ r: number, g: number, b: number, a: number } | null}
 */
export function parseColorToRgba(input) {
  if (input == null) return null;
  const s = String(input).trim().toLowerCase();
  if (s === '' || s === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  if (s.startsWith('#')) {
    const h = s.slice(1);
    if (h.length === 3) {
      return {
        r: parseInt(h[0] + h[0], 16),
        g: parseInt(h[1] + h[1], 16),
        b: parseInt(h[2] + h[2], 16),
        a: 1,
      };
    }
    if (h.length === 6) {
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
        a: 1,
      };
    }
    if (h.length === 8) {
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
        a: parseInt(h.slice(6, 8), 16) / 255,
      };
    }
    return null;
  }

  const rgb = s.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+)\s*)?\)$/,
  );
  if (rgb) {
    return {
      r: clamp255(rgb[1]),
      g: clamp255(rgb[2]),
      b: clamp255(rgb[3]),
      a: rgb[4] !== undefined ? clamp01(parseFloat(rgb[4])) : 1,
    };
  }

  return null;
}

function clamp255(v) {
  const n = Math.round(Number(v));
  return Math.min(255, Math.max(0, Number.isFinite(n) ? n : 0));
}

export function compositeRgbOverBackdrop(rgba, backdrop = { r: 255, g: 255, b: 255 }) {
  const a = clamp01(rgba.a);
  return {
    r: Math.round(rgba.r * a + backdrop.r * (1 - a)),
    g: Math.round(rgba.g * a + backdrop.g * (1 - a)),
    b: Math.round(rgba.b * a + backdrop.b * (1 - a)),
  };
}

/** WCAG relative luminance (sRGB), 0…1 */
export function relativeLuminance({ r, g, b }) {
  const lin = [r, g, b].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/**
 * Классы Tailwind для подписей / рамок внутри области с backgroundColor превью.
 * @param {string} backgroundColor — как в настройках (hex, rgb, rgba)
 */
export function getPreviewChromeFromBackground(backgroundColor) {
  const parsed = parseColorToRgba(backgroundColor);
  const backdrop = { r: 255, g: 255, b: 255 };
  let rgb = backdrop;
  if (parsed) {
    rgb = parsed.a <= 0 ? backdrop : compositeRgbOverBackdrop(parsed, backdrop);
  }

  const L = relativeLuminance(rgb);
  const dark = L < 0.22;

  if (dark) {
    return {
      isDark: true,
      sectionTitle: 'text-sm font-semibold text-gray-100',
      rowTitle: 'text-sm font-medium text-gray-100',
      subsectionTitle: 'text-xs font-semibold uppercase tracking-wide text-gray-400',
      meta: 'text-xs text-gray-400',
      divider: 'border-white/20',
      noteBox: 'rounded-md border border-white/15 bg-white/5 p-4',
      noteText: 'text-sm text-gray-200',
      noteStrong: 'font-semibold text-gray-50',
    };
  }

  return {
    isDark: false,
    sectionTitle: 'text-sm font-semibold text-gray-900',
    rowTitle: 'text-sm font-medium text-gray-900',
    subsectionTitle: 'text-xs font-semibold uppercase tracking-wide text-gray-500',
    meta: 'text-xs text-gray-500',
    divider: 'border-gray-200',
    noteBox: 'rounded-md bg-gray-50 p-4',
    noteText: 'text-sm text-gray-800',
    noteStrong: 'font-semibold text-gray-900',
  };
}
