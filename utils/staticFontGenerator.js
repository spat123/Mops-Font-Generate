/**
 * Генерация статического файла из VF на клиенте:
 * 1) POST /api/generate-static-font (Python или @web-alchemy/fonttools)
 * 2) иначе псевдо-статика: тот же буфер + CSS с font-variation-settings
 */

/**
 * @param {ArrayBuffer} fontBuffer
 * @param {Record<string, number>} variableSettings
 * @param {string} [format]
 */
const generateViaAPI = async (fontBuffer, variableSettings, format = 'woff2') => {
  const response = await fetch('/api/generate-static-font', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fontData: Buffer.from(fontBuffer).toString('base64'),
      variableSettings,
      format,
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
  return Buffer.from(result.data, 'base64');
};

const generatePseudoStatic = (fontBuffer, variableSettings, fontName) => {
  const cssVariations = Object.entries(variableSettings)
    .map(([axis, value]) => `"${axis}" ${value}`)
    .join(', ');

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
 * @param {{ format?: string, fontName?: string, preferredMethod?: 'auto'|'server'|'pseudo-static' }} [options]
 */
export const generateStaticFont = async (fontBuffer, variableSettings, options = {}) => {
  const { format = 'woff2', fontName = 'VariableFont', preferredMethod = 'auto' } = options;

  if (preferredMethod === 'auto' || preferredMethod === 'server') {
    try {
      const result = await generateViaAPI(fontBuffer, variableSettings, format);
      return {
        buffer: result,
        method: 'server',
        isRealStatic: true,
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
  };

  try {
    const response = await fetch('/api/generate-static-font', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ probe: true }),
    });
    capabilities.server = response.ok;
  } catch {
    capabilities.server = false;
  }

  return capabilities;
};
