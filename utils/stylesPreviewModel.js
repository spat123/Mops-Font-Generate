export const WEIGHT_VARIATIONS = [
  { name: 'Thin', wght: 100 },
  { name: 'ExtraLight', wght: 200 },
  { name: 'Light', wght: 300 },
  { name: 'Regular', wght: 400 },
  { name: 'Medium', wght: 500 },
  { name: 'SemiBold', wght: 600 },
  { name: 'Bold', wght: 700 },
  { name: 'ExtraBold', wght: 800 },
  { name: 'Black', wght: 900 },
];

export const ITALIC_VARIATIONS = [
  { name: 'Thin Italic', wght: 100, slnt: -10, ital: 1 },
  { name: 'Light Italic', wght: 300, slnt: -10, ital: 1 },
  { name: 'Italic', wght: 400, slnt: -10, ital: 1 },
  { name: 'Medium Italic', wght: 500, slnt: -10, ital: 1 },
  { name: 'Bold Italic', wght: 700, slnt: -10, ital: 1 },
  { name: 'Black Italic', wght: 900, slnt: -10, ital: 1 },
];

export const AXIS_RATIOS = [0, 0.25, 0.5, 0.75, 1];

export function getStylesPreviewStats(selectedFont) {
  if (!selectedFont) return { n: 0, kind: 'none' };

  const hasStaticStyles =
    selectedFont.availableStyles && selectedFont.availableStyles.length > 1;
  const hasVariableAxes =
    selectedFont.isVariableFont &&
    selectedFont.variableAxes &&
    Object.keys(selectedFont.variableAxes).length > 0;
  const showStaticStyles =
    hasStaticStyles && (!selectedFont.isVariableFont || !hasVariableAxes);

  if (showStaticStyles) {
    return { n: selectedFont.availableStyles.length, kind: 'static' };
  }

  if (hasVariableAxes) {
    const axes = selectedFont.variableAxes;
    let n = 0;

    if (axes.wght !== undefined) n += WEIGHT_VARIATIONS.length;
    if (axes.ital !== undefined || axes.slnt !== undefined) n += ITALIC_VARIATIONS.length;

    const otherKeys = Object.keys(axes).filter((axis) => !['wght', 'ital', 'slnt'].includes(axis));
    n += otherKeys.length * AXIS_RATIOS.length;

    return { n, kind: 'variable' };
  }

  return { n: 0, kind: 'none' };
}
