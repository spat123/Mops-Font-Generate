import { CATALOG_SOURCE_OPTIONS } from '../constants/fontsLibraryScreen';

/**
 * Fontsource временно выключен по умолчанию (проверка без нагрузки на /api/fontsource).
 * Включить: NEXT_PUBLIC_FONTSOURCE_ENABLED=1 или ?fontsource=1 или localStorage mfgFontsourceEnabled=1
 * Выключить явно: NEXT_PUBLIC_FONTSOURCE_DISABLED=1
 */
export function isFontsourceEnabled() {
  if (process.env.NEXT_PUBLIC_FONTSOURCE_DISABLED === '1') return false;
  if (process.env.FONTSOURCE_DISABLED === '1') return false;
  if (process.env.NEXT_PUBLIC_FONTSOURCE_ENABLED === '1') return true;
  if (process.env.FONTSOURCE_ENABLED === '1') return true;

  if (typeof window !== 'undefined') {
    try {
      if (localStorage.getItem('mfgFontsourceDisabled') === '1') return false;
      if (localStorage.getItem('mfgFontsourceEnabled') === '1') return true;
      const q = new URLSearchParams(window.location.search);
      if (q.get('fontsource') === '0') return false;
      if (q.get('fontsource') === '1') return true;
    } catch {
      /* ignore */
    }
  }

  return false;
}

export function getCatalogSourceOptions() {
  if (isFontsourceEnabled()) return CATALOG_SOURCE_OPTIONS;
  return CATALOG_SOURCE_OPTIONS.filter((o) => o.value !== 'fontsource');
}
