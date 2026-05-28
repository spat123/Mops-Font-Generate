import { findStyleInfoByWeightAndStyle } from './fontUtilsCommon';
import { listGoogleCatalogDownloadStyles } from './googleFontDownloadStyles';
import {
  downloadFontsourceStylesAsFormat,
  downloadGoogleStylesAsFormat,
  downloadLocalStylesAsFormat,
} from './catalogDownloadActions';
import type { SessionFontRecord } from '../types/editorFonts';
import type { FontInstanceStyle } from './fontInstanceStyles';

const DOWNLOAD_FORMATS = ['woff2', 'ttf', 'otf', 'woff'] as const;

export type FontDownloadStyleOption = {
  id: string;
  weight: number;
  style: 'normal' | 'italic';
  label: string;
};

export type CatalogStylePickerProps = {
  familyLabel: string;
  styles: FontDownloadStyleOption[];
  formats: readonly string[];
  onDownload: (selected: FontDownloadStyleOption[], format: string) => void | Promise<unknown>;
};

type FontsourceCatalogItem = {
  family?: string;
  slug?: string;
  isVariable?: boolean;
  weights?: number[];
  styles?: string[];
};

export function listFontsourceDownloadStyles(item: FontsourceCatalogItem | null | undefined): FontDownloadStyleOption[] {
  if (!item || item.isVariable === true) return [];
  const weights = Array.isArray(item.weights)
    ? item.weights.map((w) => Number(w)).filter((w) => Number.isFinite(w))
    : [400];
  const styleKeys = Array.isArray(item.styles)
    ? item.styles.map((s) => String(s || '').trim()).filter(Boolean)
    : ['normal'];
  const out: FontDownloadStyleOption[] = [];
  const seen = new Set<string>();
  for (const weight of weights) {
    for (const styleKey of styleKeys) {
      const style: 'normal' | 'italic' = styleKey === 'italic' ? 'italic' : 'normal';
      const sig = `${weight}:${style}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      const info = findStyleInfoByWeightAndStyle(weight, style);
      out.push({
        id: sig,
        weight,
        style,
        label: info?.name || `${weight} ${style}`,
      });
    }
  }
  out.sort((a, b) => a.weight - b.weight || (a.style === b.style ? 0 : a.style === 'italic' ? 1 : -1));
  return out;
}

export function listLocalDownloadStyles(
  sessionFont: SessionFontRecord | null | undefined,
): FontDownloadStyleOption[] {
  if (!sessionFont) return [];
  const fromList = Array.isArray(sessionFont.availableStyles) ? sessionFont.availableStyles : [];
  if (fromList.length > 0) {
    return fromList
      .map((row, index): FontDownloadStyleOption | null => {
        const weight = Number(row?.weight);
        const style: 'normal' | 'italic' = row?.style === 'italic' ? 'italic' : 'normal';
        if (!Number.isFinite(weight)) return null;
        const label = String(row?.name || '').trim() || findStyleInfoByWeightAndStyle(weight, style).name;
        return { id: `local-${index}-${weight}-${style}`, weight, style, label };
      })
      .filter((row): row is FontDownloadStyleOption => row != null);
  }
  const weight = Number(sessionFont.currentWeight);
  const style: 'normal' | 'italic' = sessionFont.currentStyle === 'italic' ? 'italic' : 'normal';
  const w = Number.isFinite(weight) ? weight : 400;
  const info = findStyleInfoByWeightAndStyle(w, style);
  return [{ id: 'local-0', weight: w, style, label: info?.name || 'Regular' }];
}

/** Проп `stylePicker` для CatalogDownloadSplitButton. */
export function buildGoogleStylePickerProps(
  entry: { family?: string; isVariable?: boolean; styleCount?: number; downloadStyles?: unknown[] } | null | undefined,
): CatalogStylePickerProps | null {
  const family = String(entry?.family || '').trim();
  let styles = listGoogleCatalogDownloadStyles(
    entry as { downloadStyles?: Array<Record<string, unknown>> },
  ) as FontDownloadStyleOption[];
  if (styles.length === 0 && entry?.isVariable !== true && Number(entry?.styleCount) > 0) {
    styles = [{ id: '400', weight: 400, style: 'normal', label: 'Regular' }];
  }
  if (!family || styles.length === 0) return null;
  return {
    familyLabel: family,
    styles,
    formats: DOWNLOAD_FORMATS,
    onDownload: (selected, format) => downloadGoogleStylesAsFormat(entry, selected as FontInstanceStyle[], format),
  };
}

export function buildFontsourceStylePickerProps(
  item: FontsourceCatalogItem | null | undefined,
): CatalogStylePickerProps | null {
  const family = String(item?.family || item?.slug || '').trim();
  const styles = listFontsourceDownloadStyles(item);
  if (!family || styles.length === 0) return null;
  return {
    familyLabel: family,
    styles,
    formats: DOWNLOAD_FORMATS,
    onDownload: (selected, format) => downloadFontsourceStylesAsFormat(item, selected as FontInstanceStyle[], format),
  };
}

export function buildLocalStylePickerProps(
  sessionFont: SessionFontRecord | null | undefined,
  label?: string,
): CatalogStylePickerProps | null {
  const styles = listLocalDownloadStyles(sessionFont);
  if (styles.length === 0 || !(sessionFont?.file instanceof Blob)) return null;
  const familyLabel = String(label || sessionFont?.name || 'Локальный шрифт').trim();
  return {
    familyLabel,
    styles,
    formats: DOWNLOAD_FORMATS,
    onDownload: (selected, format) =>
      downloadLocalStylesAsFormat(sessionFont, selected as FontInstanceStyle[], format, familyLabel),
  };
}
