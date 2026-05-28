/**
 * Генерация статического файла из VF на клиенте:
 * 1) POST /api/generate-static-font (Python или @web-alchemy/fonttools)
 * 2) иначе псевдо-статика: тот же буфер + CSS с font-variation-settings
 */

import { formatFontVariationSettings } from './fontVariationSettings';
import { getOrCreateGuestQuotaId } from './freeStaticGenerationQuota';

export type StaticFontRename = {
  family?: string;
  subfamily?: string;
  postScriptName?: string;
  weightClass?: number;
};

export type GenerateStaticFontOptions = {
  format?: string;
  fontName?: string;
  rename?: StaticFontRename | null;
  preferredMethod?: 'auto' | 'server' | 'pseudo-static';
  allowPseudoStatic?: boolean;
};

export type StaticGenerationQuota = Record<string, unknown>;

export type GenerateStaticFontResult = {
  buffer: ArrayBuffer;
  method: 'server' | 'pseudo-static';
  isRealStatic: boolean;
  engine?: string;
  renameApplied?: boolean;
  quota?: StaticGenerationQuota | null;
  css?: string;
  warning?: string;
};

export type GenerationCapabilities = {
  server: boolean;
  pseudoStatic: boolean;
  internalRename: boolean;
  engine: string | null;
};

function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  return new Uint8Array(buf).buffer.slice(0);
}

const generateViaAPI = async (
  fontBuffer: ArrayBuffer,
  variableSettings: Record<string, number>,
  format = 'woff2',
  rename: StaticFontRename | null = null,
): Promise<{
  buffer: Buffer;
  engine: string;
  renameApplied: boolean;
  quota: StaticGenerationQuota | null;
}> => {
  const guestQuotaId = getOrCreateGuestQuotaId();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
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
    let code: string | null = null;
    const raw = await response.text().catch(() => '');
    try {
      const err = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      detail = String(err.details || err.message || err.error || detail);
      if (err.runtime && typeof err.runtime === 'object') {
        const runtime = err.runtime as { canRunWorker?: boolean; workerBinary?: unknown; workerScriptExists?: boolean };
        if (!runtime.canRunWorker && !runtime.workerBinary) {
          detail += ' (на сервере нет Node/Bun для worker — FONT_GEN_NODE_PATH или bun run build)';
        } else if (runtime.workerScriptExists === false) {
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
    const error = new Error(detail) as Error & { code?: string };
    if (code) error.code = code;
    throw error;
  }

  const result = (await response.json()) as {
    data?: string;
    engine?: string;
    renameApplied?: boolean;
    quota?: StaticGenerationQuota;
  };
  return {
    buffer: Buffer.from(result.data || '', 'base64'),
    engine: result.engine || 'unknown',
    renameApplied: Boolean(result.renameApplied),
    quota: result.quota && typeof result.quota === 'object' ? result.quota : null,
  };
};

const generatePseudoStatic = (
  fontBuffer: ArrayBuffer,
  variableSettings: Record<string, number>,
  fontName: string,
) => {
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

export const generateStaticFont = async (
  fontBuffer: ArrayBuffer,
  variableSettings: Record<string, number>,
  options: GenerateStaticFontOptions = {},
): Promise<GenerateStaticFontResult> => {
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
        buffer: bufferToArrayBuffer(result.buffer),
        method: 'server',
        isRealStatic: true,
        engine: result.engine,
        renameApplied: result.renameApplied,
        quota: result.quota,
      };
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err?.code === 'QUOTA_EXCEEDED') throw e;
      if (!allowPseudoStatic) throw e;
    }
  }

  if (!allowPseudoStatic) {
    throw new Error(
      'Серверная генерация недоступна. Попробуйте позже или задайте FONT_GEN_NODE_PATH на сервере.',
    );
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
export const checkGenerationCapabilities = async (): Promise<GenerationCapabilities> => {
  const capabilities: GenerationCapabilities = {
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
        const payload = (await response.json()) as { internalRename?: boolean; engine?: string };
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
