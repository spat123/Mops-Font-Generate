/**
 * Локальная разработка: безлимитная генерация VF → static (в т.ч. без входа).
 * Включение: NODE_ENV=development и DEV_PRO_SIMULATION=1 (см. .env.local).
 */
export function isDevUnlimitedStaticGeneration() {
  if (typeof process === 'undefined') return false;
  if (process.env.NODE_ENV !== 'development') return false;
  const flag = String(
    process.env.NEXT_PUBLIC_DEV_PRO_SIMULATION || process.env.DEV_PRO_SIMULATION || '',
  ).trim();
  return flag === '1';
}
