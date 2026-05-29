import { resolveRestorablePresetName } from './fontUtilsCommon';
import type { SessionFontRecord } from '../types/editorFonts';
import type { FontViewStateRestorePlan } from '../types/fontViewState';

export type ApplyFontViewStateRestorePlanArgs = {
  font: SessionFontRecord;
  plan: FontViewStateRestorePlan;
  setVariableSettings?: (settings: Record<string, number>) => void;
  applyVariableSettings?: (
    settings: Record<string, number>,
    isFinal: boolean,
    font: SessionFontRecord,
    opts?: { skipSideEffects?: boolean; replaceAll?: boolean },
  ) => void;
  applyPresetStyle?: (presetName: string, font: SessionFontRecord) => void;
  /** defer CSS/preset side effects (как safeSelectFont в useFontManager). */
  deferSideEffects?: boolean;
};

function runDeferred(task: () => void, defer: boolean) {
  if (defer) {
    setTimeout(task, 0);
  } else {
    task();
  }
}

/**
 * Применяет план из `buildFontViewStateRestorePlan` (единая точка для safeSelectFont и persistence).
 */
export function applyFontViewStateRestorePlan({
  font,
  plan,
  setVariableSettings,
  applyVariableSettings,
  applyPresetStyle,
  deferSideEffects = false,
}: ApplyFontViewStateRestorePlanArgs): void {
  if (!font || plan.mode === 'noop') return;

  if (plan.mode === 'axes') {
    if (applyVariableSettings) {
      runDeferred(
        () => applyVariableSettings(plan.settings, true, font, { replaceAll: true }),
        deferSideEffects,
      );
    } else {
      setVariableSettings?.(plan.settings);
    }
    return;
  }

  if (plan.mode === 'preset') {
    if (plan.clearVariableSettings) {
      setVariableSettings?.({});
    }
    if (applyPresetStyle) {
      const presetName = resolveRestorablePresetName(font, plan.presetName);
      runDeferred(() => applyPresetStyle(presetName, font), deferSideEffects);
    }
    return;
  }

  if (plan.mode === 'fallback') {
    if (font.isVariableFont) {
      const next = plan.variableSettings || {};
      if (applyVariableSettings) {
        // Не финальный коммит: нужно быстро выставить wght/ital в selectedFont и variableSettings,
        // но не трогать тяжёлый `fonts` во время safeSelectFont.
        runDeferred(() => applyVariableSettings(next, false, font, { replaceAll: true }), deferSideEffects);
      } else {
        setVariableSettings?.(next);
      }
    } else {
      setVariableSettings?.({});
    }
    if (applyPresetStyle) {
      const presetName = resolveRestorablePresetName(font, plan.presetName);
      runDeferred(() => applyPresetStyle(presetName, font), deferSideEffects);
    }
  }
}
