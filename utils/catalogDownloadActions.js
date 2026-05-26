import { toast } from './appNotify';
import { base64ToArrayBuffer } from './fontManagerUtils';
import { buildSafeFileBase, saveBlobAsFile } from './fileDownloadUtils';
import {
  fetchGoogleStaticFontSlicesAll,
  fetchGoogleVariableFontSlicesAll,
} from './googleFontLoader';
import { convertBlobToFormat } from './fontFormatConvertClient';
import { createZipBlob } from './zipUtils';

function fontMimeTypeFromExt(ext) {
  const normalized = String(ext || 'woff2').toLowerCase();
  return `font/${
    normalized === 'ttf'
      ? 'ttf'
      : normalized === 'otf'
        ? 'otf'
        : normalized === 'woff'
          ? 'woff'
          : 'woff2'
  }`;
}

function fontBlobFromBase64(base64, fileName = '') {
  const ext = String(fileName || '').split('.').pop()?.toLowerCase() || 'woff2';
  const buffer = base64ToArrayBuffer(base64);
  return {
    ext,
    blob: new Blob([buffer], { type: fontMimeTypeFromExt(ext) }),
  };
}

function uniqueFileName(preferredName, usedNames) {
  const safeName = String(preferredName || 'download.bin');
  if (!usedNames.has(safeName)) {
    usedNames.add(safeName);
    return safeName;
  }

  const dotIndex = safeName.lastIndexOf('.');
  const hasExtension = dotIndex > 0;
  const stem = hasExtension ? safeName.slice(0, dotIndex) : safeName;
  const ext = hasExtension ? safeName.slice(dotIndex) : '';
  let suffix = 2;
  let candidate = `${stem}-${suffix}${ext}`;
  while (usedNames.has(candidate)) {
    suffix += 1;
    candidate = `${stem}-${suffix}${ext}`;
  }
  usedNames.add(candidate);
  return candidate;
}

export async function buildArchiveBlobFromEntries(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('Нет файлов для архива');
  }
  return createZipBlob(entries);
}

export function saveArchiveBlob(blob, fileName) {
  saveBlobAsFile(blob, fileName);
}

export async function getGoogleSlicesForDownload(entry) {
  const family = entry?.family;
  if (!family) return [];
  const subsetList = Array.isArray(entry.subsets) ? entry.subsets : [];
  const useVariable = entry.isVariable === true;
  const slices = useVariable
    ? await fetchGoogleVariableFontSlicesAll(family, {
        subsets: subsetList,
        ...(entry.wghtMin != null && entry.wghtMax != null
          ? { wghtMin: entry.wghtMin, wghtMax: entry.wghtMax }
          : {}),
      })
    : await fetchGoogleStaticFontSlicesAll(family, {
        weight: 400,
        italic: false,
        subsets: subsetList,
      });
  return Array.isArray(slices) ? slices.filter((slice) => slice?.blob?.size > 0) : [];
}

export async function fetchGoogleVariableTtfBlob(family) {
  const response = await fetch(`/api/google-font-github-vf?family=${encodeURIComponent(family)}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  if (!blob || blob.size === 0) throw new Error('Пустой файл');
  return blob;
}

export async function getGooglePackageFiles(entry) {
  const family = entry?.family;
  if (!family) return [];
  const baseName = buildSafeFileBase(family, 'google-font');
  const slices = await getGoogleSlicesForDownload(entry);
  if (slices.length === 0) return [];

  const files = slices.map((slice, index) => ({
    name: `${baseName}/web/${baseName}-${slice.style || 'normal'}-${slice.weight || 400}-${index + 1}.woff2`,
    data: slice.blob,
  }));

  if (entry?.isVariable === true) {
    try {
      const variableBlob = await fetchGoogleVariableTtfBlob(family);
      files.push({ name: `${baseName}/source/${baseName}-variable.ttf`, data: variableBlob });
    } catch {
      // optional source file
    }
  }

  return files;
}

export async function buildGooglePackageArchiveEntry(entry) {
  const family = entry?.family;
  if (!family) return null;
  const files = await getGooglePackageFiles(entry);
  if (files.length === 0) return null;
  const baseName = buildSafeFileBase(family, 'google-font');
  const zipBlob = await createZipBlob(files);
  return { name: `${baseName}-package.zip`, data: zipBlob };
}

export async function buildGoogleFormatArchiveEntry(entry, format) {
  const family = entry?.family;
  if (!family) return null;
  const targetFormat = String(format || 'woff2').toLowerCase();
  const slices = await getGoogleSlicesForDownload(entry);
  const firstSlice = slices[0] || null;
  if (!firstSlice?.blob) return null;
  const outBlob =
    targetFormat === 'woff2'
      ? firstSlice.blob
      : await convertBlobToFormat(firstSlice.blob, targetFormat);
  const baseName = buildSafeFileBase(family, 'google-font');
  return { name: `${baseName}.${targetFormat}`, data: outBlob };
}

export async function downloadGoogleCurrentWoff2(entry, { silent = false } = {}) {
  const family = entry?.family;
  if (!family) return false;
  try {
    const slices = await getGoogleSlicesForDownload(entry);
    const firstSlice = slices[0] || null;
    if (!firstSlice?.blob) throw new Error('Пустой файл');
    const baseName = buildSafeFileBase(family, 'google-font');
    const fileName = `${baseName}${entry?.isVariable ? '-variable' : ''}.woff2`;
    saveBlobAsFile(firstSlice.blob, fileName);
    if (!silent) toast.success(`Скачан ${family}`);
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось скачать ${family}`);
    return false;
  }
}

export async function downloadGoogleAsFormat(entry, format, { silent = false } = {}) {
  const family = entry?.family;
  if (!family) return false;
  const targetFormat = String(format || 'woff2').toLowerCase();
  try {
    const slices = await getGoogleSlicesForDownload(entry);
    const firstSlice = slices[0] || null;
    if (!firstSlice?.blob) throw new Error('Пустой файл');
    const outBlob =
      targetFormat === 'woff2'
        ? firstSlice.blob
        : await convertBlobToFormat(firstSlice.blob, targetFormat);
    const baseName = buildSafeFileBase(family, 'google-font');
    saveBlobAsFile(outBlob, `${baseName}.${targetFormat}`);
    if (!silent) toast.success(`Скачан ${family} (${targetFormat.toUpperCase()})`);
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось конвертировать ${family} в ${targetFormat.toUpperCase()}`);
    return false;
  }
}

export async function downloadGoogleVariableVariant(entry, { silent = false } = {}) {
  const family = entry?.family;
  if (!family || entry?.isVariable !== true) return false;
  try {
    const blob = await fetchGoogleVariableTtfBlob(family);
    const baseName = buildSafeFileBase(family, 'google-font');
    saveBlobAsFile(blob, `${baseName}-variable.ttf`);
    if (!silent) toast.success(`Скачан Variable ${family}`);
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось скачать Variable ${family}`);
    return false;
  }
}

async function fetchGoogleStaticSliceBlob(entry, { weight, style }) {
  const family = entry?.family;
  if (!family) return null;
  const subsetList = Array.isArray(entry.subsets) ? entry.subsets : [];
  const slices = await fetchGoogleStaticFontSlicesAll(family, {
    weight: Number(weight) || 400,
    italic: style === 'italic',
    subsets: subsetList,
  });
  const first = Array.isArray(slices) ? slices.find((s) => s?.blob?.size > 0) : null;
  return first?.blob || null;
}

function buildGoogleStyleFileBase(entry, variant) {
  const familyBase = buildSafeFileBase(entry?.family, 'google-font');
  const stylePart = String(variant?.style || 'normal') === 'italic' ? 'italic' : 'normal';
  const weightPart = Number(variant?.weight) || 400;
  return `${familyBase}-${stylePart}-${weightPart}`;
}

/**
 * Скачать одно или несколько статических начертаний Google (не VF).
 * @param {object} entry — запись каталога Google
 * @param {Array<{ weight: number, style: string, label?: string }>} variants
 * @param {string} format
 */
export async function downloadGoogleStylesAsFormat(entry, variants, format, { silent = false } = {}) {
  const family = entry?.family;
  const list = Array.isArray(variants) ? variants : [];
  if (!family || list.length === 0) return false;

  const targetFormat = String(format || 'woff2').toLowerCase();

  try {
    if (list.length === 1) {
      const [variant] = list;
      const blob = await fetchGoogleStaticSliceBlob(entry, variant);
      if (!blob) throw new Error('Пустой файл');
      const outBlob =
        targetFormat === 'woff2' ? blob : await convertBlobToFormat(blob, targetFormat);
      const base = buildGoogleStyleFileBase(entry, variant);
      saveBlobAsFile(outBlob, `${base}.${targetFormat}`);
      if (!silent) toast.success(`Скачан ${variant.label || family} (${targetFormat.toUpperCase()})`);
      return true;
    }

    const files = [];
    const usedNames = new Set();
    for (const variant of list) {
      // eslint-disable-next-line no-await-in-loop
      const blob = await fetchGoogleStaticSliceBlob(entry, variant);
      if (!blob) continue;
      // eslint-disable-next-line no-await-in-loop
      const outBlob =
        targetFormat === 'woff2' ? blob : await convertBlobToFormat(blob, targetFormat);
      const base = buildGoogleStyleFileBase(entry, variant);
      files.push({
        name: uniqueFileName(`${base}.${targetFormat}`, usedNames),
        data: outBlob,
      });
    }
    if (files.length === 0) throw new Error('Нет файлов');
    const stamp = new Date().toISOString().slice(0, 10);
    const zipBlob = await createZipBlob(files);
    const zipBase = buildSafeFileBase(family, 'google-font');
    saveArchiveBlob(zipBlob, `${zipBase}-styles-${stamp}.zip`);
    if (!silent) {
      toast.success(
        files.length === 1
          ? `Скачано 1 начертание (${targetFormat.toUpperCase()})`
          : `Скачано ${files.length} начертаний (${targetFormat.toUpperCase()})`,
      );
    }
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось скачать начертания ${family}`);
    return false;
  }
}

async function fetchFontsourceStaticSliceBlob(item, variant) {
  const slug = item?.id || item?.slug;
  if (!slug) return null;
  const { payload, fontBufferBase64 } = await fetchFontsourcePayload(
    getFontsourceStaticApiUrl(slug, variant?.weight, variant?.style),
  );
  const sourceFileName = String(payload?.fileName || payload?.actualFileName || `${slug}.woff2`);
  return fontBlobFromBase64(fontBufferBase64, sourceFileName).blob;
}

export async function downloadFontsourceStylesAsFormat(item, variants, format, { silent = false } = {}) {
  const slug = item?.id || item?.slug;
  const family = item?.family || slug;
  const list = Array.isArray(variants) ? variants : [];
  if (!slug || list.length === 0) return false;

  const targetFormat = String(format || 'woff2').toLowerCase();

  try {
    if (list.length === 1) {
      const [variant] = list;
      const blob = await fetchFontsourceStaticSliceBlob(item, variant);
      if (!blob) throw new Error('Пустой файл');
      const converted =
        targetFormat === 'woff2' ? blob : await convertBlobToFormat(blob, targetFormat);
      const base = buildSafeFileBase(`${family}-${variant.style}-${variant.weight}`, slug);
      saveBlobAsFile(converted, `${base}.${targetFormat}`);
      if (!silent) toast.success(`Скачан ${variant.label || family} (${targetFormat.toUpperCase()})`);
      return true;
    }

    const files = [];
    const usedNames = new Set();
    for (const variant of list) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const blob = await fetchFontsourceStaticSliceBlob(item, variant);
        if (!blob) continue;
        // eslint-disable-next-line no-await-in-loop
        const converted =
          targetFormat === 'woff2' ? blob : await convertBlobToFormat(blob, targetFormat);
        const base = buildSafeFileBase(`${family}-${variant.style}-${variant.weight}`, slug);
        files.push({
          name: uniqueFileName(`${base}.${targetFormat}`, usedNames),
          data: converted,
        });
      } catch {
        // skip failed variant
      }
    }
    if (files.length === 0) throw new Error('Нет файлов');
    const stamp = new Date().toISOString().slice(0, 10);
    const zipBlob = await createZipBlob(files);
    const zipBase = buildSafeFileBase(family, slug);
    saveArchiveBlob(zipBlob, `${zipBase}-styles-${stamp}.zip`);
    if (!silent) {
      toast.success(
        files.length === 1
          ? `Скачано 1 начертание (${targetFormat.toUpperCase()})`
          : `Скачано ${files.length} начертаний (${targetFormat.toUpperCase()})`,
      );
    }
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось скачать начертания ${family}`);
    return false;
  }
}

export async function downloadLocalStylesAsFormat(
  sessionFont,
  variants,
  format,
  label,
  { silent = false } = {},
) {
  const list = Array.isArray(variants) ? variants : [];
  const fileBlob = sessionFont?.file instanceof Blob ? sessionFont.file : null;
  if (!fileBlob || list.length === 0) return false;

  const originalName =
    String(sessionFont?.originalName || '').trim() ||
    String(sessionFont?.name || '').trim() ||
    `${label || 'font'}.woff2`;
  const sourceFormat = String(originalName).split('.').pop()?.toLowerCase() || 'woff2';
  const targetFormat = String(format || 'woff2').toLowerCase();
  const fileBase = buildSafeFileBase(label || originalName, 'local-font');

  try {
    const outBlob =
      targetFormat === sourceFormat ? fileBlob : await convertBlobToFormat(fileBlob, targetFormat);
    const variant = list[0];
    const suffix =
      list.length === 1 && variant
        ? `-${variant.style === 'italic' ? 'italic' : 'normal'}-${variant.weight}`
        : '';
    saveBlobAsFile(outBlob, `${fileBase}${suffix}.${targetFormat}`);
    if (!silent) toast.success(`Скачан ${label || originalName} (${targetFormat.toUpperCase()})`);
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось скачать ${label || originalName}`);
    return false;
  }
}

export async function downloadGooglePackageZip(entry, { silent = false } = {}) {
  const family = entry?.family;
  if (!family) return false;
  try {
    const files = await getGooglePackageFiles(entry);
    if (files.length === 0) throw new Error('Нет файлов для упаковки');
    const zipBlob = await createZipBlob(files);
    const baseName = buildSafeFileBase(family, 'google-font');
    saveBlobAsFile(zipBlob, `${baseName}-package.zip`);
    if (!silent) toast.success(`Скачан пакет ${family}`);
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось собрать пакет ${family}`);
    return false;
  }
}

function getFontsourceStaticApiUrl(slug, weight = 400, style = 'normal') {
  const w = Number.isFinite(Number(weight)) ? Number(weight) : 400;
  const st = String(style || 'normal').trim() === 'italic' ? 'italic' : 'normal';
  return `/api/fontsource/${encodeURIComponent(slug)}?weight=${w}&style=${st}&subset=latin`;
}

function getFontsourceVariableApiUrl(slug) {
  return `/api/fontsource/${encodeURIComponent(slug)}/variable?subset=latin&style=normal&forceVariable=true`;
}

async function fetchFontsourcePayload(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  const fontBufferBase64 = payload?.fontBufferBase64 ?? payload?.fontData;
  if (!fontBufferBase64) throw new Error('Пустой буфер');
  return { payload, fontBufferBase64 };
}

export async function getFontsourcePackageFiles(item) {
  const slug = item?.id || item?.slug;
  if (!slug) return [];

  const baseName = buildSafeFileBase(item?.family || slug, slug);
  const files = [];

  try {
    const { payload, fontBufferBase64 } = await fetchFontsourcePayload(getFontsourceStaticApiUrl(slug));
    const fileNameRaw = String(payload?.fileName || payload?.actualFileName || `${slug}.woff2`);
    const ext = fileNameRaw.split('.').pop()?.toLowerCase() || 'woff2';
    files.push({
      name: `${baseName}/web/${buildSafeFileBase(fileNameRaw, `${baseName}.${ext}`)}`,
      data: base64ToArrayBuffer(fontBufferBase64),
    });
  } catch {
    // optional static file
  }

  if (item?.isVariable) {
    try {
      const { payload, fontBufferBase64 } = await fetchFontsourcePayload(getFontsourceVariableApiUrl(slug));
      const fileNameRaw = String(payload?.fileName || `${slug}-variable.woff2`);
      files.push({
        name: `${baseName}/source/${buildSafeFileBase(fileNameRaw, `${baseName}-variable.woff2`)}`,
        data: base64ToArrayBuffer(fontBufferBase64),
      });
    } catch {
      // optional variable file
    }
  }

  return files;
}

export async function buildFontsourcePackageArchiveEntry(item) {
  const slug = item?.id || item?.slug;
  if (!slug) return null;
  const files = await getFontsourcePackageFiles(item);
  if (files.length === 0) return null;
  const baseName = buildSafeFileBase(item?.family || slug, slug);
  const zipBlob = await createZipBlob(files);
  return { name: `${baseName}-package.zip`, data: zipBlob };
}

export async function buildFontsourceFormatArchiveEntry(item, format) {
  const slug = item?.id || item?.slug;
  if (!slug) return null;
  const targetFormat = String(format || 'woff2').toLowerCase();
  const isVariable = Boolean(item?.isVariable);
  const { payload, fontBufferBase64 } = await fetchFontsourcePayload(
    isVariable ? getFontsourceVariableApiUrl(slug) : getFontsourceStaticApiUrl(slug),
  );
  const sourceFileName =
    String(payload?.fileName || payload?.actualFileName || `${slug}.woff2`);
  const { blob } = fontBlobFromBase64(fontBufferBase64, sourceFileName);
  const converted =
    targetFormat === 'woff2' ? blob : await convertBlobToFormat(blob, targetFormat);
  const baseName = buildSafeFileBase(item?.family || slug, slug);
  return { name: `${baseName}.${targetFormat}`, data: converted };
}

export async function buildSelectionArchiveEntries(items, buildEntry) {
  const files = [];
  const usedNames = new Set();
  for (const item of items) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const entry = await buildEntry(item);
      if (!entry?.data) continue;
      files.push({
        ...entry,
        name: uniqueFileName(entry.name, usedNames),
      });
    } catch {
      // skip failed item
    }
  }
  return files;
}

export async function downloadFontsourceCurrentFile(item, { silent = false } = {}) {
  const slug = item?.id || item?.slug;
  if (!slug) return false;
  try {
    const isVariable = Boolean(item?.isVariable);
    const { payload, fontBufferBase64 } = await fetchFontsourcePayload(
      isVariable ? getFontsourceVariableApiUrl(slug) : getFontsourceStaticApiUrl(slug),
    );
    const fileNameRaw = String(payload?.fileName || payload?.actualFileName || `${slug}.woff2`);
    const { ext, blob } = fontBlobFromBase64(fontBufferBase64, fileNameRaw);
    const fallbackName = `${slug}${isVariable ? '-variable' : ''}.${ext || 'woff2'}`;
    saveBlobAsFile(blob, fileNameRaw || fallbackName);
    if (!silent) toast.success(`Скачан ${item?.family || slug}`);
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось скачать ${item?.family || slug}`);
    return false;
  }
}

export async function downloadFontsourceAsFormat(item, format, { silent = false } = {}) {
  const slug = item?.id || item?.slug;
  if (!slug) return false;
  const targetFormat = String(format || 'woff2').toLowerCase();
  try {
    const isVariable = Boolean(item?.isVariable);
    const { payload, fontBufferBase64 } = await fetchFontsourcePayload(
      isVariable ? getFontsourceVariableApiUrl(slug) : getFontsourceStaticApiUrl(slug),
    );
    const sourceFileName =
      String(payload?.fileName || payload?.actualFileName || `${slug}.woff2`);
    const { blob } = fontBlobFromBase64(fontBufferBase64, sourceFileName);
    const converted =
      targetFormat === 'woff2' ? blob : await convertBlobToFormat(blob, targetFormat);
    const baseName = buildSafeFileBase(item?.family || slug, slug);
    saveBlobAsFile(converted, `${baseName}.${targetFormat}`);
    if (!silent) toast.success(`Скачан ${item?.family || slug} (${targetFormat.toUpperCase()})`);
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось конвертировать ${item?.family || slug} в ${targetFormat.toUpperCase()}`);
    return false;
  }
}

export async function downloadFontsourceVariableVariant(item, { silent = false } = {}) {
  const slug = item?.id || item?.slug;
  if (!slug || item?.isVariable !== true) return false;
  try {
    const { payload, fontBufferBase64 } = await fetchFontsourcePayload(getFontsourceVariableApiUrl(slug));
    const fileNameRaw = String(payload?.fileName || `${slug}-variable.woff2`);
    const { ext, blob } = fontBlobFromBase64(fontBufferBase64, fileNameRaw);
    const baseName = buildSafeFileBase(item?.family || slug, slug);
    saveBlobAsFile(blob, `${baseName}-variable.${ext}`);
    if (!silent) toast.success(`Скачан Variable ${item?.family || slug}`);
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось скачать Variable ${item?.family || slug}`);
    return false;
  }
}

export async function downloadFontsourcePackageZip(item, { silent = false } = {}) {
  const slug = item?.id || item?.slug;
  if (!slug) return false;
  try {
    const files = await getFontsourcePackageFiles(item);
    if (files.length === 0) throw new Error('Нет файлов для упаковки');
    const zipBlob = await createZipBlob(files);
    const baseName = buildSafeFileBase(item?.family || slug, slug);
    saveBlobAsFile(zipBlob, `${baseName}-package.zip`);
    if (!silent) toast.success(`Скачан пакет ${item?.family || slug}`);
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось собрать пакет ${item?.family || slug}`);
    return false;
  }
}
