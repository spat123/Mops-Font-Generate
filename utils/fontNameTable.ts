import type { FontAdditionalInfoRow, FontSeoPage } from '../data/fontSeoPages';

export type FontNameTable = {
  copyright?: string;
  fontFamily?: string;
  fontSubfamily?: string;
  identifier?: string;
  fullName?: string;
  version?: string;
  postScriptName?: string;
  trademark?: string;
  manufacturer?: string;
  designer?: string;
  description?: string;
  vendorUrl?: string;
  designerUrl?: string;
  license?: string;
  licenseUrl?: string;
};

type NameField = string | { en?: string; [key: string]: unknown } | undefined;

function pickNameValue(value: NameField): string {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const en = String(value.en || '').trim();
    if (en) return en;
    for (const raw of Object.values(value)) {
      const text = String(raw || '').trim();
      if (text) return text;
    }
  }
  return '';
}

function cleanUrl(value: string): string {
  return value.replace(/\s+/g, '').trim();
}

function compactTable(table: FontNameTable): FontNameTable | null {
  const out: FontNameTable = {};
  (Object.keys(table) as Array<keyof FontNameTable>).forEach((key) => {
    const value = String(table[key] || '').trim();
    if (!value) return;
    out[key] = key === 'vendorUrl' || key === 'designerUrl' || key === 'licenseUrl' ? cleanUrl(value) : value;
  });
  return Object.keys(out).length > 0 ? out : null;
}

export function extractFontNameTableFromParsedFont(
  font: unknown,
): FontNameTable | null {
  const names =
    font && typeof font === 'object' && 'names' in font
      ? (font as { names?: Record<string, NameField> }).names
      : null;
  if (!names || typeof names !== 'object') return null;

  return compactTable({
    copyright: pickNameValue(names.copyright),
    fontFamily: pickNameValue(names.fontFamily),
    fontSubfamily: pickNameValue(names.fontSubfamily),
    identifier: pickNameValue(names.uniqueID),
    fullName: pickNameValue(names.fullName),
    version: pickNameValue(names.version),
    postScriptName: pickNameValue(names.postScriptName),
    trademark: pickNameValue(names.trademark),
    manufacturer: pickNameValue(names.manufacturer),
    designer: pickNameValue(names.designer),
    description: pickNameValue(names.description),
    vendorUrl: pickNameValue(names.manufacturerURL),
    designerUrl: pickNameValue(names.designerURL),
    license: pickNameValue(names.license),
    licenseUrl: pickNameValue(names.licenseURL),
  });
}

export function fontNameTableToAdditionalInfoRows(table: FontNameTable | null | undefined): FontAdditionalInfoRow[] {
  if (!table) return [];
  return [
    { label: 'Copyright', value: table.copyright || '' },
    { label: 'Font family', value: table.fontFamily || '' },
    { label: 'Font subfamily', value: table.fontSubfamily || '' },
    { label: 'Identifier', value: table.identifier || '' },
    { label: 'Full name', value: table.fullName || '' },
    { label: 'Version', value: table.version || '' },
    { label: 'PostScriptName', value: table.postScriptName || '' },
    { label: 'Trademark', value: table.trademark || '' },
    { label: 'Manufacturer', value: table.manufacturer || '' },
    { label: 'Designer', value: table.designer || '' },
    { label: 'Description', value: table.description || '' },
    { label: 'Vendor URL', value: table.vendorUrl || '' },
    { label: 'Designer URL', value: table.designerUrl || '' },
    { label: 'License', value: table.license || '' },
    { label: 'License URL', value: table.licenseUrl || '' },
  ].filter((row) => row.value);
}

function mergeRows(primary: FontAdditionalInfoRow[], fallback: FontAdditionalInfoRow[]): FontAdditionalInfoRow[] {
  const out: FontAdditionalInfoRow[] = [];
  const seen = new Set<string>();
  for (const row of [...primary, ...fallback]) {
    const key = String(row.label || '').trim().toLowerCase();
    const value = String(row.value || '').trim();
    if (!key || !value || seen.has(key)) continue;
    seen.add(key);
    out.push({ label: row.label, value });
  }
  return out;
}

export function applyFontNameTableToSeoPage(page: FontSeoPage, table: FontNameTable | null): FontSeoPage {
  if (!table) return page;
  const nameRows = fontNameTableToAdditionalInfoRows(table);
  return {
    ...page,
    nameTable: table,
    copyright: table.copyright || page.copyright,
    studio: table.manufacturer || page.studio,
    designers: table.designer ? [table.designer] : page.designers,
    licenseDescription: table.license || page.licenseDescription,
    additionalInfo: mergeRows(nameRows, page.additionalInfo),
  };
}
