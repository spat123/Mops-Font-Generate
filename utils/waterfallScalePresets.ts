/** Пресеты типографической шкалы Waterfall (модульная scale ratio). */

export type WaterfallScalePreset = {
  key: string;
  ratio: number;
  label: string;
};

export const WATERFALL_SCALE_PRESETS: WaterfallScalePreset[] = [
  { key: 'minor-second', ratio: 1.067, label: '1.067 - Minor Second' },
  { key: 'major-second', ratio: 1.125, label: '1.125 - Major Second' },
  { key: 'minor-third', ratio: 1.2, label: '1.200 - Minor Third' },
  { key: 'major-third', ratio: 1.25, label: '1.250 - Major Third' },
  { key: 'perfect-fourth', ratio: 1.333, label: '1.333 - Perfect Fourth' },
  { key: 'augmented-fourth', ratio: 1.414, label: '1.414 - Augmented Fourth' },
  { key: 'perfect-fifth', ratio: 1.5, label: '1.500 - Perfect Fifth' },
  { key: 'golden-ratio', ratio: 1.618, label: '1.618 - Golden Ratio' },
];

export const DEFAULT_WATERFALL_SCALE_PRESET =
  WATERFALL_SCALE_PRESETS.find((p) => p.key === 'major-third') || WATERFALL_SCALE_PRESETS[0];

const PRESET_RATIO_EPS = 0.0005;

export function findWaterfallScalePresetByRatio(ratio: unknown): WaterfallScalePreset | null {
  const r = Number(ratio);
  if (!Number.isFinite(r)) return null;
  return WATERFALL_SCALE_PRESETS.find((p) => Math.abs(p.ratio - r) <= PRESET_RATIO_EPS) || null;
}

export function getWaterfallScaleSelectKeyForRatio(ratio: unknown): string {
  const hit = findWaterfallScalePresetByRatio(ratio);
  return hit ? hit.key : 'custom';
}

export function isWaterfallCustomScaleRatio(ratio: unknown): boolean {
  return getWaterfallScaleSelectKeyForRatio(ratio) === 'custom';
}
