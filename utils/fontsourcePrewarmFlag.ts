/** Включён ли фоновый prewarm Fontsource (query `?prewarm=1` или localStorage). */
export function isFontsourcePrewarmEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get('prewarm') === '1') return true;
    if (q.get('prewarm') === '0') return false;
  } catch {
    // ignore
  }
  try {
    return localStorage.getItem('mfgFontsourcePrewarm') === '1';
  } catch {
    return false;
  }
}
