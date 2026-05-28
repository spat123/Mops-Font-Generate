import { formatFontVariationSettings } from './fontVariationSettings';
import { getFormatFromExtension } from './fontUtilsCommon';
import { letterSpacingPercentToEm } from './editorTypography';
import type { SessionFontRecord } from '../types/editorFonts';

export type BuildEditorExportCssCodeParams = {
  selectedFont: SessionFontRecord | null;
  variableSettings: Record<string, unknown>;
  fontSize: number;
  lineHeight: number | string;
  letterSpacing: number | string;
  textColor: string;
  textDirection: string;
  textAlignment: string;
  textCase: string;
};

type TypographyBlockParams = Pick<
  BuildEditorExportCssCodeParams,
  'fontSize' | 'lineHeight' | 'letterSpacing' | 'textColor' | 'textDirection' | 'textAlignment' | 'textCase'
> & { familyName: string; variationSettings?: string };

function buildExportTypographyBlock({
  familyName,
  fontSize,
  lineHeight,
  letterSpacing,
  textColor,
  textDirection,
  textAlignment,
  textCase,
  variationSettings,
}: TypographyBlockParams): string {
  const fvsLine = variationSettings
    ? `  font-variation-settings: ${variationSettings};\n`
    : '';
  return `.your-element {
  font-family: '${familyName}', sans-serif;
${fvsLine}  font-size: ${fontSize}px;
  line-height: ${lineHeight};
  letter-spacing: ${letterSpacingPercentToEm(letterSpacing)};
  color: ${textColor || '#000000'};
  direction: ${textDirection};
  text-align: ${textAlignment};
  text-transform: ${textCase};
}
`;
}

const WEIGHT_PRESET_CLASSES = [
  { className: 'font-light', wght: 300 },
  { className: 'font-regular', wght: 400 },
  { className: 'font-medium', wght: 500 },
  { className: 'font-bold', wght: 700 },
] as const;

/**
 * Полный CSS для ExportModal: @font-face, :root vars, пример .your-element.
 */
export function buildEditorExportCssCode({
  selectedFont,
  variableSettings,
  fontSize,
  lineHeight,
  letterSpacing,
  textColor,
  textDirection,
  textAlignment,
  textCase,
}: BuildEditorExportCssCodeParams): string {
  if (!selectedFont) return '';

  const familyName = selectedFont.fontFamily || selectedFont.name || '';
  const format = getFormatFromExtension(selectedFont.name) || 'truetype';
  const fontUrl = selectedFont.url || 'путь/к/вашему/шрифту.ttf';

  let cssCode = `/* @font-face правило для загрузки шрифта */
@font-face {
  font-family: '${familyName}';
  src: url('${fontUrl}') format('${format}');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

`;

  const typographyBase = {
    familyName,
    fontSize,
    lineHeight,
    letterSpacing,
    textColor,
    textDirection,
    textAlignment,
    textCase,
  };

  if (selectedFont.isVariableFont && variableSettings && Object.keys(variableSettings).length > 0) {
    cssCode += `/* CSS переменные для вариативных осей */
:root {
${Object.entries(variableSettings)
  .map(([tag, value]) => `  --font-${tag}: ${value};`)
  .join('\n')}
}

`;

    const variationSettingsStr = formatFontVariationSettings(
      variableSettings as Record<string, number | string>,
      {
        fallback: 'normal',
        valueFormatter: (tag) => `var(--font-${tag})`,
      },
    );

    cssCode += `/* Пример использования вариативного шрифта */
${buildExportTypographyBlock({ ...typographyBase, variationSettings: variationSettingsStr })}

`;

    cssCode += `/* Примеры предустановленных стилей на основе вариативных осей */
${WEIGHT_PRESET_CLASSES.map(
  ({ className, wght }) =>
    `.${className} {
  font-variation-settings: ${formatFontVariationSettings({ wght }, { fallback: 'normal' })};
}`,
)
  .join('\n')}
`;
  } else {
    cssCode += `/* Пример использования шрифта */
${buildExportTypographyBlock(typographyBase)}`;
  }

  return cssCode;
}
