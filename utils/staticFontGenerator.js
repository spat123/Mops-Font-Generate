/**
 * Генерация статического файла из VF на клиенте:
 * 1) POST /api/generate-static-font (Python или @web-alchemy/fonttools)
 * 2) иначе псевдо-статика: тот же буфер + CSS с font-variation-settings
 */

import { formatFontVariationSettings } from './fontVariationSettings';
import { getOrCreateGuestQuotaId } from './freeStaticGenerationQuota';

/**
 * @param {ArrayBuffer} fontBuffer
 * @param {Record<string, number>} variableSettings
 * @param {string} [format]
 * @param {{family?: string, subfamily?: string, postScriptName?: string, weightClass?: number} | null} [rename]
 */
const generateViaAPI = async (fontBuffer, variableSettings, format = 'woff2', rename = null) => {
  const guestQuotaId = getOrCreateGuestQuotaId();
  const headers = { 'Content-Type': 'application/json' };
  if (guestQuotaId) headers['X-Guest-Quota-Id'] = guestQuotaId;

  const response = await fetch('/api/generate-static-font', {
    method: 'POST',
    credentials: 'same-origin',
    headers,
    body: JSON.stringify({
      fontData: Buffer.from(fontBuffer).toString('base64'),
      variableSettings,
      format,
      rename: rename && typeof rename === 'object' ? rename : undefined,
    }),
  });

  if (!response.ok) {
    let detail = 'Серверная генерация не удалась';
    let code = null;
    const raw = await response.text().catch(() => '');
    try {
      const err = raw ? JSON.parse(raw) : {};
      detail = err.details || err.message || err.error || detail;
      if (err.runtime && typeof err.runtime === 'object') {
        if (!err.runtime.canRunWorker && !err.runtime.workerBinary) {
          detail += ' (на сервере нет Node/Bun для worker — FONT_GEN_NODE_PATH или bun run build)';
        } else if (err.runtime.workerScriptExists === false) {
          detail += ' (worker-скрипт не задеплоен)';
        }
      }
      if (response.status === 429 || err.error === 'QUOTA_EXCEEDED') {
        code = 'QUOTA_EXCEEDED';
      }
    } catch {
      if (raw && raw.length < 500) detail = `${detail} (HTTP ${response.status}: ${raw.trim()})`;
      else if (response.status) detail = `${detail} (HTTP ${response.status})`;
    }
    const error = new Error(detail);
    if (code) error.code = code;
    throw error;
  }

  const result = await response.json();
  return {
    buffer: Buffer.from(result.data, 'base64'),
    engine: result.engine || 'unknown',
    renameApplied: Boolean(result.renameApplied),
    quota: result.quota && typeof result.quota === 'object' ? result.quota : null,
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
 * @param {{ format?: string, fontName?: string, rename?: {family?: string, subfamily?: string, postScriptName?: string, weightClass?: number}, preferredMethod?: 'auto'|'server'|'pseudo-static', allowPseudoStatic?: boolean }} [options]
 */
export const generateStaticFont = async (fontBuffer, variableSettings, options = {}) => {
  const {
    format = 'woff2',
    fontName = 'VariableFont',
    rename = null,
    preferredMethod = 'auto',
    allowPseudoStatic = true,
  } = options;

  if (preferredMethod === 'auto' || preferredMethod === 'server') {
    try {
      const result = await generateViaAPI(fontBuffer, variableSettings, format, rename);
      return {
        buffer: result.buffer,
        method: 'server',
        isRealStatic: true,
        engine: result.engine,
        renameApplied: result.renameApplied,
        quota: result.quota,
      };
    } catch (e) {
      if (e?.code === 'QUOTA_EXCEEDED') throw e;
      if (!allowPseudoStatic) throw e;
      /* pseudo-static fallback */
    }
  }

  if (!allowPseudoStatic) {
    throw new Error('Серверная генерация недоступна. Попробуйте позже или задайте FONT_GEN_NODE_PATH на сервере.');
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
