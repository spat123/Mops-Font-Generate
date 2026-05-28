/**
 * Генерация вспомогательных файлов экспорта по режимам превью (plain / waterfall / glyphs / styles).
 */

import { parseFontBuffer } from './fontParser';
import { extractBasicGlyphData, type BasicGlyphData, type OpentypeFontLike } from './glyphUtils';
import {
  getStylesPreviewStats,
  ITALIC_VARIATIONS,
  WEIGHT_VARIATIONS,
} from './stylesPreviewModel';
import type { SessionFontRecord } from '../types/editorFonts';

/** Ограничение по ширине canvas (типичный потолок в браузерах). */
const PLAIN_TEXT_EXPORT_MAX_CANVAS_WIDTH = 8192;

export type WaterfallLadderMeta = {
  rows?: number;
  baseSize?: number;
  unit?: string;
  scaleRatio?: number;
  editTarget?: string;
};

export type PlainPreviewSvgParams = {
  text?: string;
  fontFamily?: string;
  fontSizePx?: number;
  textColor?: string;
  backgroundColor?: string;
};

export type RenderPlainTextToImageParams = {
  text?: string;
  fontFamily?: string;
  fontSizePx?: number;
  lineHeight?: number;
  letterSpacingEm?: number;
  textColor?: string;
  backgroundColor?: string;
  mime?: 'image/png' | 'image/jpeg' | 'image/webp';
  minWidth?: number;
  maxHeight?: number;
  wrapContentWidth?: number;
};

function wrapLineToMaxCanvasWidth(
  ctx: CanvasRenderingContext2D,
  line: string,
  maxContentWidth: number,
): string[] {
  const s = String(line ?? '');
  if (!s) return [''];
  if (maxContentWidth <= 1) return [s];
  if (ctx.measureText(s).width <= maxContentWidth) return [s];

  const rows: string[] = [];
  let rest = s;
  while (rest.length) {
    if (ctx.measureText(rest).width <= maxContentWidth) {
      rows.push(rest);
      break;
    }
    let lo = 1;
    let hi = rest.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (ctx.measureText(rest.slice(0, mid)).width <= maxContentWidth) lo = mid;
      else hi = mid - 1;
    }
    let take = Math.max(1, lo);
    const chunk = rest.slice(0, take);
    const lastSpace = chunk.lastIndexOf(' ');
    if (lastSpace > 0) {
      const atWord = rest.slice(0, lastSpace);
      if (ctx.measureText(atWord).width <= maxContentWidth) take = lastSpace;
    }
    rows.push(rest.slice(0, take));
    rest = rest.slice(take).replace(/^\s+/, '');
  }
  return rows.length ? rows : [''];
}

function flattenWrappedLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  maxContentWidth: number,
): string[] {
  const out: string[] = [];
  for (const line of lines) {
    out.push(...wrapLineToMaxCanvasWidth(ctx, line, maxContentWidth));
  }
  return out;
}

/**
 * Ширина колонки plain-текста в редакторе (для переносов как у `pre-wrap` + `break-word`).
 * Если plain смонтирован — берём ширину `.editable-sync-plain`, иначе — контейнер с data-атрибутом.
 */
export function getPlainPreviewTextWrapWidthPx(): number {
  if (typeof document === 'undefined') return 880;
  const nodes = document.querySelectorAll('.editable-sync-plain');
  let best = 0;
  nodes.forEach((plain) => {
    const rect = plain.getBoundingClientRect();
    const styles = window.getComputedStyle(plain);
    const pl = parseFloat(styles.paddingLeft) || 0;
    const pr = parseFloat(styles.paddingRight) || 0;
    const w = rect.width - pl - pr;
    if (Number.isFinite(w) && w > best) best = w;
  });
  if (best >= 120) return Math.floor(best);
  const wrap = document.querySelector('[data-preview-plain-export-wrap]');
  if (wrap) {
    const w = wrap.clientWidth;
    if (Number.isFinite(w) && w >= 120) return Math.max(200, Math.floor(w));
  }
  return 880;
}

export async function fetchFontArrayBufferForExport(
  font: SessionFontRecord | null | undefined,
): Promise<ArrayBuffer | null> {
  if (!font) return null;
  try {
    if (font.arrayBuffer instanceof ArrayBuffer && font.arrayBuffer.byteLength > 0) {
      return font.arrayBuffer;
    }
    if (font.file && typeof font.file.arrayBuffer === 'function') {
      const buf = await font.file.arrayBuffer();
      return buf instanceof ArrayBuffer && buf.byteLength > 0 ? buf : null;
    }
    if (font.url && typeof fetch === 'function') {
      const res = await fetch(font.url);
      if (!res.ok) return null;
      return await res.arrayBuffer();
    }
  } catch {
    return null;
  }
  return null;
}

export async function loadGlyphTableForExport(
  selectedFont: SessionFontRecord | null | undefined,
): Promise<BasicGlyphData | null> {
  const buf = await fetchFontArrayBufferForExport(selectedFont);
  if (!buf) return null;
  const font = await parseFontBuffer(buf, selectedFont?.name || 'export');
  if (!font) return null;
  return extractBasicGlyphData(font as OpentypeFontLike, 'export');
}

export function buildGlyphTableCsv(glyphData: BasicGlyphData | null | undefined, maxRows = 50000): string {
  const rows = (glyphData?.allGlyphs || []).slice(0, maxRows);
  const lines = ['index;glyph_name;unicode_hex;advance_width'];
  for (const g of rows) {
    const uni = glyphData?.unicodes?.[g.id] || '';
    const name = String(g.name || '').replace(/;/g, ',');
    lines.push(`${g.id};${name};${uni};${glyphData?.advanceWidths?.[g.id] ?? g.advanceWidth ?? ''}`);
  }
  return lines.join('\n');
}

export function buildGlyphTableJson(glyphData: BasicGlyphData | null | undefined, maxRows = 50000): string {
  const rows = (glyphData?.allGlyphs || []).slice(0, maxRows).map((g) => ({
    index: g.id,
    name: g.name,
    unicode: glyphData?.unicodes?.[g.id] || null,
    advanceWidth: glyphData?.advanceWidths?.[g.id] ?? g.advanceWidth ?? null,
  }));
  return JSON.stringify({ generatedBy: 'DINAMIC FONT', count: rows.length, glyphs: rows }, null, 2);
}

function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildGlyphTableHtml(
  glyphData: BasicGlyphData | null | undefined,
  fontName: string,
  maxRows = 8000,
): string {
  const rows = (glyphData?.allGlyphs || []).slice(0, maxRows);
  const body = rows
    .map(
      (g) =>
        `<tr><td class="n">${g.id}</td><td>${escapeHtml(g.name)}</td><td class="u">${escapeHtml(
          glyphData?.unicodes?.[g.id] || '—',
        )}</td><td class="n">${escapeHtml(String(glyphData?.advanceWidths?.[g.id] ?? g.advanceWidth ?? ''))}</td></tr>`,
    )
    .join('\n');
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<title>Глифы — ${escapeHtml(fontName)}</title>
<style>
 body { font-family: system-ui, sans-serif; margin: 1rem; color: #111; }
 table { border-collapse: collapse; width: 100%; font-size: 12px; }
 th, td { border: 1px solid #ddd; padding: 4px 8px; text-align: left; }
 th { background: #f4f4f5; position: sticky; top: 0; }
 td.n { font-variant-numeric: tabular-nums; width: 4rem; }
 td.u { font-family: ui-monospace, monospace; font-size: 11px; }
 caption { text-align: left; font-weight: 600; margin-bottom: 0.5rem; }
</style>
</head>
<body>
<table>
<caption>${escapeHtml(fontName)} — до ${rows.length} глифов</caption>
<thead><tr><th>#</th><th>Имя</th><th>Unicode</th><th>Advance</th></tr></thead>
<tbody>
${body}
</tbody>
</table>
</body>
</html>`;
}

function getWaterfallLadderSizes(meta: WaterfallLadderMeta | null | undefined) {
  const rows = Math.max(1, Math.min(32, Number(meta?.rows) || 14));
  const base = Number(meta?.baseSize) || 96;
  const unit = String(meta?.unit || 'px');
  const ratio = Number(meta?.scaleRatio);
  const r = Number.isFinite(ratio) && ratio > 0 ? ratio : 1.25;
  const sizesPx: number[] = [];
  let s = base;
  for (let i = 0; i < rows; i += 1) {
    sizesPx.push(Math.round(s * 1000) / 1000);
    s /= r;
  }
  return { rows, base, unit, r, editTarget: meta?.editTarget, sizesPx };
}

/** Текстовый блок параметров лестницы (для .txt). */
export function buildWaterfallLadderPlainText(meta: WaterfallLadderMeta | null | undefined, fontName: string): string {
  const name = String(fontName || 'Шрифт').trim();
  const { rows, base, unit, r, editTarget, sizesPx } = getWaterfallLadderSizes(meta);
  const target = editTarget === 'heading' ? 'Heading' : 'Body';
  const lines = [
    `Waterfall — ${name}`,
    `Строк: ${rows}, база: ${base}px, шаг: ${r}, подписи: ${unit}, слой: ${target}`,
    '',
    'Размеры по строкам (px):',
  ];
  sizesPx.forEach((px, index) => {
    lines.push(`${index + 1}. ${px}`);
  });
  lines.push('', '---', '');
  return lines.join('\n');
}

/** Блок комментариев для Waterfall CSS: параметры лестницы и размеры строк. */
export function buildWaterfallLadderCssComments(
  meta: WaterfallLadderMeta | null | undefined,
  fontName: string,
): string {
  const name = String(fontName || 'Шрифт').trim();
  const { rows, base, unit, r, editTarget, sizesPx } = getWaterfallLadderSizes(meta);
  const target = editTarget === 'heading' ? 'Heading' : 'Body';
  const lines = [
    '/* --- Waterfall: лестница размеров --- */',
    `/* Шрифт: ${name} */`,
    `/* Строк: ${rows}, база: ${base}px, шаг: ${r}, подписи: ${unit}, слой: ${target} */`,
    '/* font-size по строкам (сверху вниз): */',
  ];
  sizesPx.forEach((px, index) => {
    lines.push(`/* ${index + 1}. ${px}px */`);
  });
  lines.push('/* --- */', '');
  return lines.join('\n');
}

export function buildStylesInventoryMarkdown(selectedFont: SessionFontRecord | null | undefined): string {
  const name = String(selectedFont?.name || 'Шрифт').trim();
  const stats = getStylesPreviewStats(selectedFont);
  const lines = [`# Styles — сводка: ${name}`, '', `- карточек в превью (оценка): **${stats.n}**`, `- тип: **${stats.kind}**`, ''];

  const available = selectedFont?.availableStyles;
  if (stats.kind === 'static' && Array.isArray(available)) {
    lines.push('## Статические начертания', '');
    for (const st of available) {
      const row = st as { name?: string; postScriptName?: string; id?: string };
      lines.push(`- ${String(row?.name || row?.postScriptName || row?.id || st)}`);
    }
  }

  if (stats.kind === 'variable') {
    lines.push('## Вариативные ряды (как в превью Styles)', '');
    lines.push('### Веса (wght)', '');
    for (const row of WEIGHT_VARIATIONS) {
      lines.push(`- **${row.name}** — wght ${row.wght}`);
    }
    lines.push('', '### Курсивные варианты', '');
    for (const row of ITALIC_VARIATIONS) {
      lines.push(`- **${row.name}** — wght ${row.wght}, ital ${row.ital}, slnt ${row.slnt}`);
    }
    const axes =
      selectedFont?.variableAxes && typeof selectedFont.variableAxes === 'object'
        ? selectedFont.variableAxes
        : {};
    const other = Object.keys(axes).filter((a) => !['wght', 'ital', 'slnt'].includes(a));
    if (other.length) {
      lines.push('', '### Другие оси', '');
      for (const tag of other) {
        lines.push(`- **${tag}** — см. сетку в режиме Styles в редакторе`);
      }
    }
  }

  lines.push('', '---', 'Экспорт из DINAMIC FONT. Сверяйте с панелью Styles в редакторе.');
  return lines.join('\n');
}

export function buildStylesInventoryCsv(selectedFont: SessionFontRecord | null | undefined): string {
  const stats = getStylesPreviewStats(selectedFont);
  const lines = ['section;label;values'];
  lines.push(`meta;kind;${stats.kind}`);
  lines.push(`meta;cards_estimate;${stats.n}`);

  const available = selectedFont?.availableStyles;
  if (stats.kind === 'static' && Array.isArray(available)) {
    for (const st of available) {
      const row = st as { name?: string; postScriptName?: string; id?: string };
      const label = String(row?.name || row?.postScriptName || row?.id || '');
      lines.push(`static;${label.replace(/;/g, ',')};`);
    }
  }

  if (stats.kind === 'variable') {
    for (const row of WEIGHT_VARIATIONS) {
      lines.push(`wght;${row.name};${row.wght}`);
    }
    for (const row of ITALIC_VARIATIONS) {
      lines.push(`italic;${row.name};wght=${row.wght},ital=${row.ital},slnt=${row.slnt}`);
    }
  }
  return lines.join('\n');
}

export function buildPlainPreviewSvgPayload({
  text,
  fontFamily,
  fontSizePx,
  textColor,
  backgroundColor,
}: PlainPreviewSvgParams): string {
  const raw = String(text ?? '').replace(/\r\n/g, '\n');
  let lines = raw.split('\n');
  const fs = Math.max(8, Math.min(240, Number(fontSizePx) || 32));
  const lh = 1.35;
  const lineH = fs * lh;
  const pad = 24;
  let w = 1200;
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    if (ctx) {
      const fam = String(fontFamily || 'sans-serif').replace(/['"]/g, '');
      ctx.font = `${fs}px ${fam}, system-ui, sans-serif`;
      const wrapPx = Math.max(
        120,
        Math.min(PLAIN_TEXT_EXPORT_MAX_CANVAS_WIDTH - pad * 2 - 8, getPlainPreviewTextWrapWidthPx()),
      );
      lines = flattenWrappedLines(ctx, lines, wrapPx);
      let maxLineW = 0;
      for (const ln of lines) {
        maxLineW = Math.max(maxLineW, ctx.measureText(ln || ' ').width);
      }
      w = Math.min(PLAIN_TEXT_EXPORT_MAX_CANVAS_WIDTH, Math.max(400, Math.ceil(pad * 2 + maxLineW + 8)));
    }
  }
  const h = Math.min(3200, pad * 2 + lines.length * lineH + 40);

  const tspans = lines
    .map((line, i) => `<tspan x="${pad}" dy="${i === 0 ? 0 : lineH}">${escapeHtml(line) || ' '}</tspan>`)
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${Math.ceil(h)}" viewBox="0 0 ${w} ${Math.ceil(h)}">
  <rect width="100%" height="100%" fill="${escapeHtml(backgroundColor || '#ffffff')}"/>
  <text fill="${escapeHtml(textColor || '#111111')}" font-family="${escapeHtml(fontFamily)}, sans-serif" font-size="${fs}px" xml:space="preserve">
    ${tspans}
  </text>
</svg>`;
}

/**
 * Растровый снимок текста (plain). Нужны загруженные шрифты в document.fonts для точного начертания.
 */
export async function renderPlainTextToImageBlob({
  text,
  fontFamily,
  fontSizePx,
  lineHeight,
  letterSpacingEm,
  textColor,
  backgroundColor,
  mime = 'image/png',
  minWidth = 400,
  maxHeight = 2400,
  wrapContentWidth,
}: RenderPlainTextToImageParams): Promise<Blob> {
  const raw = String(text ?? '').replace(/\r\n/g, '\n');
  const initialLines = raw.split('\n');
  const fs = Math.max(8, Math.min(240, Number(fontSizePx) || 32));
  const lh = Number.isFinite(Number(lineHeight)) ? Number(lineHeight) : 1.4;
  const lineH = fs * lh;
  const pad = 28;

  if (typeof document === 'undefined' || !document.createElement) {
    throw new Error('Canvas недоступен');
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context недоступен');

  const fam = String(fontFamily || 'sans-serif').replace(/['"]/g, '');
  const fontSpec = `${fs}px ${fam}, system-ui, sans-serif`;
  ctx.font = fontSpec;
  try {
    await document.fonts?.load?.(`${fs}px ${fam}`);
  } catch {
    /* ignore */
  }
  ctx.font = fontSpec;

  const resolvedWrap =
    Number.isFinite(Number(wrapContentWidth)) && Number(wrapContentWidth) > 0
      ? Number(wrapContentWidth)
      : getPlainPreviewTextWrapWidthPx();
  const wrapPx = Math.max(120, Math.min(PLAIN_TEXT_EXPORT_MAX_CANVAS_WIDTH - pad * 2 - 8, resolvedWrap));
  const lines = flattenWrappedLines(ctx, initialLines, wrapPx);
  let maxLineW = 0;
  for (const line of lines) {
    maxLineW = Math.max(maxLineW, ctx.measureText(line || ' ').width);
  }

  const minCanvasW = Math.min(Math.max(32, Number(minWidth) || 400), PLAIN_TEXT_EXPORT_MAX_CANVAS_WIDTH);
  const canvasW = Math.min(
    PLAIN_TEXT_EXPORT_MAX_CANVAS_WIDTH,
    Math.max(minCanvasW, Math.ceil(pad * 2 + maxLineW + 8)),
  );
  const height = Math.min(maxHeight, pad * 2 + lines.length * lineH + 24);

  canvas.width = canvasW;
  canvas.height = Math.ceil(height);

  ctx.fillStyle = backgroundColor || '#ffffff';
  ctx.fillRect(0, 0, canvasW, canvas.height);

  ctx.fillStyle = textColor || '#111111';
  ctx.font = fontSpec;
  const lsp = Number.isFinite(Number(letterSpacingEm)) ? Number(letterSpacingEm) * fs : 0;
  ctx.textBaseline = 'top';

  let y = pad;
  for (const line of lines) {
    ctx.fillText(line, pad + lsp * 0.5, y);
    y += lineH;
    if (y > canvas.height - pad) break;
  }

  const quality = mime === 'image/jpeg' ? 0.92 : undefined;
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Не удалось создать изображение'));
      },
      mime,
      quality,
    );
  });
}
