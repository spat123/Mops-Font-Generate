/** Извлекает числовой score популярности из строки каталога (Fontsource API и др.). */
export function pickCatalogPopularityScore(row: Record<string, unknown>): number {
  if (!row || typeof row !== 'object') return 0;
  const candidates = [
    row.popularity,
    row.popularityScore,
    row.rank,
    row.score,
    row.downloads,
    row.weeklyDownloads,
    row.monthlyDownloads,
  ];
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const metrics = row.metrics;
  const nested =
    metrics && typeof metrics === 'object' && !Array.isArray(metrics)
      ? [
          (metrics as Record<string, unknown>).popularity,
          (metrics as Record<string, unknown>).score,
          (metrics as Record<string, unknown>).downloads,
        ]
      : [];
  for (const value of nested) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}
