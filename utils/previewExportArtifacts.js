/**
 * Генерация вспомогательных файлов экспорта по режимам превью (plain / waterfall / glyphs / styles).
 */

import { parseFontBuffer } from './fontParser';
import { extractBasicGlyphData } from './glyphUtils';
import {
  getStylesPreviewStats,
  ITALIC_VARIATIONS,
  WEIGHT_VARIATIONS,
} from './stylesPreviewModel';

/** Ограничение по ширине canvas (типичный потолок в браузерах). */
const PLAIN_TEXT_EXPORT_MAX_CANVAS_WIDTH = 8192;

/**
 * Перенос одной строки по ширине контента (UTF-16). Длиннее max — бинарный поиск + граница слова.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} line
 * @param {number} maxContentWidth
 * @returns {string[]}
 */
function wrapLineToMaxCanvasWidth(ctx, line, maxContentWidth) {
  const s = String(line ?? '');
  if (!s) return [''];
  if (maxContentWidth <= 1) return [s];
  if (ctx.measureText(s).width <= maxContentWidth) return [s];

  const rows = [];
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

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string[]} lines
 * @param {number} maxContentWidth
 */
function flattenWrappedLines(ctx, lines, maxContentWidth) {
  /** @type {string[]} */
  const out = [];
  for (const line of lines) {
    out.push(...wrapLineToMaxCanvasWidth(ctx, line, maxContentWidth));
  }
  return out;
}

/**
 * Ширина колонки plain-текста в редакторе (для переносов как у `pre-wrap` + `break-word`).
 * Если plain смонтирован — берём ширину `.editable-sync-plain`, иначе — контейнер с data-атрибутом.
 */
export function getPlainPreviewTextWrapWidthPx() {
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

/** @param {import('../contexts/FontContext').FontLike | null | undefined} font */
export async function fetchFontArrayBufferForExport(font) {
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

/**
 * @returns {Promise<{ allGlyphs: object[], names: object, unicodes: object, advanceWidths: object }|null>}
 */
export async function loadGlyphTableForExport(selectedFont) {
  const buf = await fetchFontArrayBufferForExport(selectedFont);
  if (!buf) return null;
  const font = await parseFontBuffer(buf, selectedFont?.name || 'export');
  if (!font) return null;
  return extractBasicGlyphData(font, 'export');
}

export function buildGlyphTableCsv(glyphData, maxRows = 50000) {
  const rows = (glyphData?.allGlyphs || []).slice(0, maxRows);
  const lines = ['index;glyph_name;unicode_hex;advance_width'];
  for (const g of rows) {
    const uni = glyphData?.unicodes?.[g.id] || '';
    const name = String(g.name || '').replace(/;/g, ',');
    lines.push(`${g.id};${name};${uni};${glyphData?.advanceWidths?.[g.id] ?? g.advanceWidth ?? ''}`);
  }
  return lines.join('\n');
}

export function buildGlyphTableJson(glyphData, maxRows = 50000) {
  const rows = (glyphData?.allGlyphs || []).slice(0, maxRows).map((g) => ({
    index: g.id,
    name: g.name,
    unicode: glyphData?.unicodes?.[g.id] || null,
    advanceWidth: glyphData?.advanceWidths?.[g.id] ?? g.advanceWidth ?? null,
  }));
  return JSON.stringify({ generatedBy: 'DINAMIC FONT', count: rows.length, glyphs: rows }, null, 2);
}

export function buildGlyphTableHtml(glyphData, fontName, maxRows = 8000) {
  const rows = (glyphData?.allGlyphs || []).slice(0, maxRows);
  const esc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  const body = rows
    .map(
      (g) =>
        `<tr><td class="n">${g.id}</td><td>${esc(g.name)}</td><td class="u">${esc(
          glyphData?.unicodes?.[g.id] || '—',
        )}</td><td class="n">${esc(String(glyphData?.advanceWidths?.[g.id] ?? g.advanceWidth ?? ''))}</td></tr>`,
    )
    .join('\n');
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<title>Глифы — ${esc(fontName)}</title>
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
<caption>${esc(fontName)} — до ${rows.length} глифов</caption>
<thead><tr><th>#</th><th>Имя</th><th>Unicode</th><th>Advance</th></tr></thead>
<tbody>
${body}
</tbody>
</table>
</body>
</html>`;
}

export function buildWaterfallLadderMarkdown(meta, fontName) {
  const name = String(fontName || 'Шрифт').trim();
  const rows = Math.max(1, Math.min(32, Number(meta?.rows) || 14));
  const base = Number(meta?.baseSize) || 96;
  const unit = String(meta?.unit || 'px');
  const ratio = Number(meta?.scaleRatio);
  const r = Number.isFinite(ratio) && ratio > 0 ? ratio : 1.25;
  const lines = [
    `# Waterfall — ${name}`,
    '',
    'Параметры лестницы (из редактора):',
    '',
    `- строк: **${rows}**`,
    `- базовый размер: **${base}px**`,
    `- единицы подписи: **${unit}**`,
    `- коэффициент шага: **${r}**`,
    `- цель редактирования: **${meta?.editTarget === 'heading' ? 'Heading' : 'Body'}**`,
    '',
    'Размеры строк (px, ориентировочно):',
    '',
  ];
  let s = base;
  for (let i = 0; i < rows; i += 1) {
    lines.push(`- ${i + 1}. **${Math.round(s * 1000) / 1000} px**`);
    s /= r;
  }
  lines.push(
    '',
    'Дальше: вставьте свой `@font-face` из экспорта «Plain → CSS» и задайте `font-size` по строкам так же, как в приложении.',
  );
  return lines.join('\n');
}

export function buildStylesInventoryMarkdown(selectedFont) {
  const name = String(selectedFont?.name || 'Шрифт').trim();
  const stats = getStylesPreviewStats(selectedFont);
  const lines = [`# Styles — сводка: ${name}`, '', `- карточек в превью (оценка): **${stats.n}**`, `- тип: **${stats.kind}**`, ''];

  if (stats.kind === 'static' && Array.isArray(selectedFont?.availableStyles)) {
    lines.push('## Статические начертания', '');
    for (const st of selectedFont.availableStyles) {
      lines.push(`- ${String(st?.name || st?.postScriptName || st)}`);
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
    const axes = selectedFont?.variableAxes && typeof selectedFont.variableAxes === 'object' ? selectedFont.variableAxes : {};
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

export function buildStylesInventoryCsv(selectedFont) {
  const stats = getStylesPreviewStats(selectedFont);
  const lines = ['section;label;values'];
  lines.push(`meta;kind;${stats.kind}`);
  lines.push(`meta;cards_estimate;${stats.n}`);

  if (stats.kind === 'static' && Array.isArray(selectedFont?.availableStyles)) {
    for (const st of selectedFont.availableStyles) {
      const label = String(st?.name || st?.postScriptName || st?.id || '');
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

/**
 * HTML для печати в PDF через браузер (Chrome: Печать → Сохранить как PDF).
 */
export function buildPrintToPdfHtmlDocument({ title, bodyHtml, fontFamily, fontSizePx }) {
  const esc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: ${esc(fontFamily)}, system-ui, sans-serif; font-size: ${Number(fontSizePx) || 14}px; line-height: 1.45; color: #111; }
  .toolbar { position: sticky; top: 0; background: #fafafa; border-bottom: 1px solid #ddd; padding: 10px 0; margin: -8px -8px 16px; }
  .hint { font-size: 12px; color: #555; max-width: 48rem; }
  @media print { .toolbar { display: none !important; } }
</style>
</head>
<body>
  <div class="toolbar">
    <strong>Печать в PDF</strong>
    <p class="hint">Сочетание <kbd>Ctrl+P</kbd> (или ⌘+P) → принтер «Сохранить как PDF» / Microsoft Print to PDF.</p>
  </div>
  ${bodyHtml}
</body>
</html>`;
}

export function buildPlainPreviewSvgPayload({ text, fontFamily, fontSizePx, textColor, backgroundColor }) {
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
      const wrapPx = Math.max(120, Math.min(PLAIN_TEXT_EXPORT_MAX_CANVAS_WIDTH - pad * 2 - 8, getPlainPreviewTextWrapWidthPx()));
      lines = flattenWrappedLines(ctx, lines, wrapPx);
      let maxLineW = 0;
      for (const ln of lines) {
        maxLineW = Math.max(maxLineW, ctx.measureText(ln || ' ').width);
      }
      w = Math.min(
        PLAIN_TEXT_EXPORT_MAX_CANVAS_WIDTH,
        Math.max(400, Math.ceil(pad * 2 + maxLineW + 8)),
      );
    }
  }
  const h = Math.min(3200, pad * 2 + lines.length * lineH + 40);
  const esc = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const tspans = lines
    .map((line, i) => `<tspan x="${pad}" dy="${i === 0 ? 0 : lineH}">${esc(line) || ' '}</tspan>`)
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${Math.ceil(h)}" viewBox="0 0 ${w} ${Math.ceil(h)}">
  <rect width="100%" height="100%" fill="${esc(backgroundColor || '#ffffff')}"/>
  <text fill="${esc(textColor || '#111111')}" font-family="${esc(fontFamily)}, sans-serif" font-size="${fs}px" xml:space="preserve">
    ${tspans}
  </text>
</svg>`;
}

/**
 * Растровый снимок текста (plain). Нужны загруженные шрифты в document.fonts для точного начертания.
 * @param {'image/png'|'image/jpeg'|'image/webp'} mime
 * @param {number} [minWidth] — минимальная ширина (px), если текст короткий; по умолчанию 400.
 * @param {number} [wrapContentWidth] — ширина переноса строк (как колонка превью), px; не задано — {@link getPlainPreviewTextWrapWidthPx}.
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
}) {
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

  const minCanvasW = Math.min(
    Math.max(32, Number(minWidth) || 400),
    PLAIN_TEXT_EXPORT_MAX_CANVAS_WIDTH,
  );
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
  const lsp = Number.isFinite(Number(letterSpacingEm)) ? letterSpacingEm * fs : 0;
  ctx.textBaseline = 'top';

  let y = pad;
  for (const line of lines) {
    ctx.fillText(line, pad + lsp * 0.5, y);
    y += lineH;
    if (y > canvas.height - pad) break;
  }

  const quality = mime === 'image/jpeg' ? 0.92 : undefined;
  return await new Promise((resolve, reject) => {
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
