import { FONT_LICENSE_BY_ID } from '../config/fontLicenses';

/** Нормализация строки лицензии из API / файла → id справочника. */
export function normalizeFontLicenseId(raw: unknown): string {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[™®]/g, '')
    .replace(/\s+/g, ' ');

  if (!s) return 'unknown';

  const compact = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const aliases: Record<string, string> = {
    'ofl-1-1': 'sil-ofl-1.1',
    'ofl-1.1': 'sil-ofl-1.1',
    'sil-open-font-license-1-1': 'sil-ofl-1.1',
    'sil-ofl-1-1': 'sil-ofl-1.1',
    'sil-ofl-1.1': 'sil-ofl-1.1',
    'apache-2-0': 'apache-2.0',
    'apache-2.0': 'apache-2.0',
    'apache-license-2-0': 'apache-2.0',
    mit: 'mit',
    'mit-license': 'mit',
    'ubuntu-font-license-1-0': 'ubuntu-1.0',
    'ubuntu-1-0': 'ubuntu-1.0',
    'ubuntu-1.0': 'ubuntu-1.0',
    'cc0-1-0': 'cc0-1.0',
    'cc0-1.0': 'cc0-1.0',
    'cc-by-3-0': 'cc-by-3.0',
    'cc-by-3.0': 'cc-by-3.0',
    'cc-by-4-0': 'cc-by-4.0',
    'cc-by-4.0': 'cc-by-4.0',
    'cc-by-sa-3-0': 'cc-by-sa-3.0',
    'cc-by-sa-3.0': 'cc-by-sa-3.0',
    'cc-by-sa-4-0': 'cc-by-sa-4.0',
    'cc-by-sa-4.0': 'cc-by-sa-4.0',
    'cc-by-nd-3-0': 'cc-by-nd-3.0',
    'cc-by-nd-3.0': 'cc-by-nd-3.0',
    'cc-by-nd-4-0': 'cc-by-nd-4.0',
    'cc-by-nd-4.0': 'cc-by-nd-4.0',
    'cc-by-nc-3-0': 'cc-by-nc-3.0',
    'cc-by-nc-3.0': 'cc-by-nc-3.0',
    'cc-by-nc-sa-3-0': 'cc-by-nc-sa-3.0',
    'cc-by-nc-sa-3.0': 'cc-by-nc-sa-3.0',
    'cc-by-nc-nd-3-0': 'cc-by-nc-nd-3.0',
    'cc-by-nc-nd-3.0': 'cc-by-nc-nd-3.0',
    'gpl-2-0': 'gpl-2.0',
    'gpl-2.0': 'gpl-2.0',
    'gnu-gpl-2-0': 'gpl-2.0',
    'gpl-3-0': 'gpl-3.0',
    'gpl-3.0': 'gpl-3.0',
    'gnu-gpl-3-0': 'gpl-3.0',
    'lgpl-3-0': 'lgpl-3.0',
    'lgpl-3.0': 'lgpl-3.0',
    'gnu-lgpl-3-0': 'lgpl-3.0',
    sil_ofl: 'sil-ofl-1.1',
    itf_ffl: 'itf-ffl',
    'itf-ffl': 'itf-ffl',
    trial: 'trial',
    demo: 'trial',
  };

  if (aliases[compact]) return aliases[compact];
  if (aliases[s]) return aliases[s];
  if (FONT_LICENSE_BY_ID[compact]) return compact;

  if (/ofl/.test(compact)) return 'sil-ofl-1.1';
  if (/apache/.test(compact)) return 'apache-2.0';
  if (compact === 'mit' || compact.startsWith('mit-')) return 'mit';

  return 'unknown';
}

export function getFontLicenseLabelRu(licenseId: string): string {
  return FONT_LICENSE_BY_ID[licenseId]?.shortLabel || licenseId;
}
