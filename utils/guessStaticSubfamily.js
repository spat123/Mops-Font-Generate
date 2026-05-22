import { variableFontAllowsItalicPresets } from './fontUtilsCommon';

function guessWeightName(wght) {
  const n = typeof wght === 'number' ? wght : Number(wght);
  if (!Number.isFinite(n)) return 'Regular';
  if (n <= 150) return 'Thin';
  if (n <= 250) return 'ExtraLight';
  if (n <= 350) return 'Light';
  if (n <= 450) return 'Regular';
  if (n <= 550) return 'Medium';
  if (n <= 650) return 'SemiBold';
  if (n <= 750) return 'Bold';
  if (n <= 850) return 'ExtraBold';
  return 'Black';
}

/**
 * Subfamily по осям с учётом реальных fvar (без «Italic», если шрифт не поддерживает курсив в VF).
 */
export function guessSubfamilyForVariableFont(settings, selectedFont) {
  const axes = selectedFont?.variableAxes;
  const allowItalic = variableFontAllowsItalicPresets(axes, selectedFont?.italicMode);
  const wght = settings?.wght;
  const ital = axes && Object.prototype.hasOwnProperty.call(axes, 'ital') && allowItalic ? settings?.ital : undefined;
  const slnt =
    axes && Object.prototype.hasOwnProperty.call(axes, 'slnt') && allowItalic ? settings?.slnt : undefined;

  const base = guessWeightName(wght);
  const isItalic =
    allowItalic &&
    (ital === 1 ||
      ital === true ||
      (typeof slnt === 'number' && Number.isFinite(slnt) && slnt < 0));
  if (!isItalic) return base;
  return base === 'Regular' ? 'Italic' : `${base} Italic`;
}
