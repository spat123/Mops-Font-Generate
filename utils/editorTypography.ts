/** UI letter-spacing (0–100) → em число (растр / canvas). */
export function letterSpacingPercentToEmValue(percent: number | string | null | undefined): number {
  return ((Number(percent) || 0) / 100) * 0.5;
}

/** UI letter-spacing (0–100) → CSS em (как в FontPreview / ExportModal). */
export function letterSpacingPercentToEm(percent: number | string | null | undefined): string {
  return `${letterSpacingPercentToEmValue(percent)}em`;
}
