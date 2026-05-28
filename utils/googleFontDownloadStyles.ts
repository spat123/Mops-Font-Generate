import { findStyleInfoByWeightAndStyle } from './fontUtilsCommon';
import type { FontInstanceStyle } from './fontInstanceStyles';

export type GoogleMetadataVariant = FontInstanceStyle & { id: string };

export function googleMetadataStyleKeyToVariant(key: unknown): GoogleMetadataVariant | null {
  const raw = String(key || '').trim();
  if (!raw) return null;
  const k = raw.toLowerCase();

  if (k === 't') {
    return { id: raw, weight: 100, style: 'normal', label: 'Thin' };
  }

  const italic = /i$/.test(k) && k.length > 1;
  const numPart = italic ? k.slice(0, -1) : k;
  let weight = Number.parseInt(numPart, 10);
  if (!Number.isFinite(weight)) {
    if (numPart === 'regular' || k === 'r') weight = 400;
    else return null;
  }

  const style = italic ? 'italic' : 'normal';
  const info = findStyleInfoByWeightAndStyle(weight, style);
  return {
    id: raw,
    weight,
    style,
    label: info?.name || `${weight}${italic ? ' Italic' : ''}`,
  };
}

export function listGoogleDownloadStylesFromFontsObj(
  fontsObj: Record<string, unknown> | null | undefined,
): GoogleMetadataVariant[] {
  if (!fontsObj || typeof fontsObj !== 'object' || Array.isArray(fontsObj)) return [];
  const variants = Object.keys(fontsObj)
    .map(googleMetadataStyleKeyToVariant)
    .filter((v): v is GoogleMetadataVariant => v != null);
  const seen = new Set<string>();
  const out: GoogleMetadataVariant[] = [];
  for (const v of variants) {
    const sig = `${v.weight}:${v.style}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(v);
  }
  out.sort((a, b) => a.weight - b.weight || (a.style === b.style ? 0 : a.style === 'italic' ? 1 : -1));
  return out;
}

export function listGoogleCatalogDownloadStyles(
  entry: { downloadStyles?: Array<Record<string, unknown>> } | null | undefined,
): FontInstanceStyle[] {
  if (!entry) return [];
  if (Array.isArray(entry.downloadStyles) && entry.downloadStyles.length > 0) {
    return entry.downloadStyles
      .map((row) => {
        const weight = Number(row?.weight);
        const style = row?.style === 'italic' ? 'italic' : 'normal';
        if (!Number.isFinite(weight)) return null;
        const label =
          String(row?.label || '').trim() || findStyleInfoByWeightAndStyle(weight, style).name;
        return {
          id: String(row?.id || `${weight}${style === 'italic' ? 'i' : ''}`),
          weight,
          style,
          label,
        } as FontInstanceStyle & { id: string };
      })
      .filter((v): v is FontInstanceStyle & { id: string } => v != null);
  }
  return [];
}
