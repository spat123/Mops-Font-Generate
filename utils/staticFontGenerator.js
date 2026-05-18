/**
 * Генерация статического файла из VF на клиенте:
 * 1) POST /api/generate-static-font (Python или @web-alchemy/fonttools)
 * 2) иначе псевдо-статика: тот же буфер + CSS с font-variation-settings
 */

import { formatFontVariationSettings } from './fontVariationSettings';

/**
 * @param {ArrayBuffer} fontBuffer
 * @param {Record<string, number>} variableSettings
 * @param {string} [format]
 * @param {{family?: string, subfamily?: string, postScriptName?: string} | null} [rename]
 */
const generateViaAPI = async (fontBuffer, variableSettings, format = 'woff2', rename = null) => {
  const response = await fetch('/api/generate-static-font', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fontData: Buffer.from(fontBuffer).toString('base64'),
      variableSettings,
      format,
      rename: rename && typeof rename === 'object' ? rename : undefined,
    }),
  });

  if (!response.ok) {
    let detail = 'Серверная генерация не удалась';
    try {
      const err = await response.json();
      detail = err.details || err.error || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  const result = await response.json();
  return {
    buffer: Buffer.from(result.data, 'base64'),
    engine: result.engine || 'unknown',
    renameApplied: Boolean(result.renameApplied),
  };
};

const generatePseudoStatic = (fontBuffer, variableSettings, fontName) => {
  const cssVariations = formatFontVariationSettings(variableSettings, { fallback: 'normal' });

  const base64 = Buffer.from(fontBuffer).toString('base64');

  const css = `
@font-face {
  font-family: "${fontName}-Static";
  src: url(data:font/woff2;base64,${base64}) format("woff2");
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
    isPseudoStatic: true,
  };
};

/**
 * @param {ArrayBuffer} fontBuffer
 * @param {Record<string, number>} variableSettings
 * @param {{ format?: string, fontName?: string, rename?: {family?: string, subfamily?: string, postScriptName?: string}, preferredMethod?: 'auto'|'server'|'pseudo-static' }} [options]
 */
export const generateStaticFont = async (fontBuffer, variableSettings, options = {}) => {
  const { format = 'woff2', fontName = 'VariableFont', rename = null, preferredMethod = 'auto' } = options;

  if (preferredMethod === 'auto' || preferredMethod === 'server') {
    try {
      const result = await generateViaAPI(fontBuffer, variableSettings, format, rename);
      return {
        buffer: result.buffer,
        method: 'server',
        isRealStatic: true,
        engine: result.engine,
        renameApplied: result.renameApplied,
      };
    } catch {
      /* fallback */
    }
  }

  const result = generatePseudoStatic(fontBuffer, variableSettings, fontName);
  return {
    buffer: result.fontBuffer,
    css: result.css,
    method: 'pseudo-static',
    isRealStatic: false,
    warning:
      'Создан псевдо-статический шрифт. Для настоящей статической генерации нужен рабочий /api/generate-static-font.',
  };
};

/** Доступность серверного /api/generate-static-font и fallback. */
export const checkGenerationCapabilities = async () => {
  const capabilities = {
    server: false,
    pseudoStatic: true,
    internalRename: false,
    engine: null,
  };

  try {
    const response = await fetch('/api/generate-static-font', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ probe: true }),
    });
    capabilities.server = response.ok;
    if (response.ok) {
      try {
        const payload = await response.json();
        capabilities.internalRename = Boolean(payload?.internalRename);
        capabilities.engine = payload?.engine || null;
      } catch {
        // ignore: backward compatible
      }
    }
  } catch {
    capabilities.server = false;
  }

  return capabilities;
};
