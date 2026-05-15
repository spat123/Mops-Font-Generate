import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFontContext } from '../contexts/FontContext';
import { getDefaultPreviewSettingsSnapshot, useSettings } from '../contexts/SettingsContext';
import { toast } from '../utils/appNotify';
import { applyPerFontPreviewSnapshot } from '../utils/perFontPreviewSettings';
import CatalogSessionAddSpinner from './ui/CatalogSessionAddSpinner';
import { Tooltip } from './ui/Tooltip';

const RESET_DELAY_MS = 1400;

function hasObjectValue(value) {
  return value != null && value !== '';
}

function normalizeAxisSettings(settings) {
  if (!settings || typeof settings !== 'object') return {};
  return Object.fromEntries(
    Object.entries(settings).filter(([, value]) => Number.isFinite(Number(value))),
  );
}

// Только оси текущего шрифта; лишние ключи из прошлого VF не считаем изменением.
function hasVariableSettingsChanges(currentSettings, defaultSettings) {
  const current = normalizeAxisSettings(currentSettings);
  const defaults = normalizeAxisSettings(defaultSettings);

  for (const key of Object.keys(defaults)) {
    const def = Number(defaults[key]);
    const cur = Number(current[key] ?? def);
    if (cur !== def) {
      return true;
    }
  }

  return false;
}

function areValuesEqual(currentValue, defaultValue) {
  if (typeof currentValue === 'number' || typeof defaultValue === 'number') {
    return Number(currentValue) === Number(defaultValue);
  }
  return currentValue === defaultValue;
}

/** Поля Waterfall — сброс в WF не трогает размер/типографику Plain. */
const WATERFALL_PREVIEW_RESET_KEYS = new Set([
  'waterfallRows',
  'waterfallBaseSize',
  'waterfallEditTarget',
  'waterfallHeadingPresetName',
  'waterfallBodyPresetName',
  'waterfallHeadingLineHeight',
  'waterfallBodyLineHeight',
  'waterfallHeadingLetterSpacing',
  'waterfallBodyLetterSpacing',
  'waterfallScaleRatio',
  'waterfallUnit',
  'waterfallRoundPx',
]);

/** Plain / Text: типографика и фон превью (без полей Waterfall). */
const PLAIN_TEXT_PREVIEW_RESET_KEYS = new Set([
  'fontSize',
  'lineHeight',
  'letterSpacing',
  'textColor',
  'backgroundColor',
  'textDirection',
  'textAlignment',
  'textCase',
  'textDecoration',
  'listStyle',
  'textColumns',
  'textColumnGap',
  'verticalAlignment',
  'textFill',
  'previewBackgroundImage',
]);

const STYLES_PREVIEW_RESET_KEYS = new Set(['stylesFontSize', 'stylesLetterSpacing']);
const GLYPHS_PREVIEW_RESET_KEYS = new Set(['glyphsFontSize']);

function getPreviewResetKeysForViewMode(viewMode) {
  switch (viewMode) {
    case 'waterfall':
      return WATERFALL_PREVIEW_RESET_KEYS;
    case 'plain':
    case 'text':
      return PLAIN_TEXT_PREVIEW_RESET_KEYS;
    case 'styles':
      return new Set([...PLAIN_TEXT_PREVIEW_RESET_KEYS, ...STYLES_PREVIEW_RESET_KEYS]);
    case 'glyphs':
      return new Set([...PLAIN_TEXT_PREVIEW_RESET_KEYS, ...GLYPHS_PREVIEW_RESET_KEYS]);
    default:
      return null;
  }
}

/** Сбрасываем к дефолту только ключи режима; остальное берём из current (в т.ч. другой режим). */
function buildMergedResetSnapshot(defaults, current, viewMode) {
  const keysToReset = getPreviewResetKeysForViewMode(viewMode);
  if (!keysToReset) {
    return { ...defaults, viewMode: current.viewMode, text: current.text };
  }
  const out = { ...defaults };
  out.viewMode = current.viewMode;
  out.text = current.text;
  for (const key of Object.keys(defaults)) {
    if (key === 'viewMode' || key === 'text') continue;
    if (!keysToReset.has(key)) {
      out[key] = Object.prototype.hasOwnProperty.call(current, key) ? current[key] : defaults[key];
    }
  }
  return out;
}

function getPerViewResetShortLabel(viewMode) {
  switch (viewMode) {
    case 'plain':
      return 'Сбросить Plain';
    case 'waterfall':
      return 'Сбросить Waterfall';
    case 'styles':
      return 'Сбросить Styles';
    case 'glyphs':
      return 'Сбросить Glyphs';
    case 'text':
      return 'Сбросить Text';
    default:
      return 'Сбросить настройки';
  }
}

function CloseIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden {...props}>
      <path
        d="M5 5L15 15M15 5L5 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ResetButton({ onResetSelectedFont, compact = false }) {
  const {
    resetApplicationState,
    selectedFont,
    variableSettings,
    getDefaultAxisValues,
    selectedPresetName,
    getResetTargetPresetName,
  } = useFontContext();
  const {
    resetSettings,
    text,
    setText,
    fontSize,
    setFontSize,
    glyphsFontSize,
    setGlyphsFontSize,
    stylesFontSize,
    setStylesFontSize,
    lineHeight,
    setLineHeight,
    letterSpacing,
    setLetterSpacing,
    stylesLetterSpacing,
    setStylesLetterSpacing,
    textColor,
    setTextColor,
    backgroundColor,
    setBackgroundColor,
    viewMode,
    setViewMode,
    textDirection,
    setTextDirection,
    textAlignment,
    setTextAlignment,
    textCase,
    setTextCase,
    textDecoration,
    setTextDecoration,
    listStyle,
    setListStyle,
    textColumns,
    setTextColumns,
    textColumnGap,
    setTextColumnGap,
    waterfallRows,
    setWaterfallRows,
    waterfallBaseSize,
    setWaterfallBaseSize,
    waterfallEditTarget,
    setWaterfallEditTarget,
    waterfallHeadingPresetName,
    setWaterfallHeadingPresetName,
    waterfallBodyPresetName,
    setWaterfallBodyPresetName,
    waterfallHeadingLineHeight,
    setWaterfallHeadingLineHeight,
    waterfallBodyLineHeight,
    setWaterfallBodyLineHeight,
    waterfallHeadingLetterSpacing,
    setWaterfallHeadingLetterSpacing,
    waterfallBodyLetterSpacing,
    setWaterfallBodyLetterSpacing,
    waterfallScaleRatio,
    setWaterfallScaleRatio,
    waterfallUnit,
    setWaterfallUnit,
    waterfallRoundPx,
    setWaterfallRoundPx,
    verticalAlignment,
    setVerticalAlignment,
    textFill,
    setTextFill,
    textCenter,
    setTextCenter,
    previewBackgroundImage,
    setPreviewBackgroundImage,
  } = useSettings();
  const resetTimeoutRef = useRef(null);
  const [isPendingReset, setIsPendingReset] = useState(false);
  const [pendingTargetFontId, setPendingTargetFontId] = useState(null);
  const [progressActive, setProgressActive] = useState(false);
  const defaultPreviewSettings = useMemo(() => getDefaultPreviewSettingsSnapshot(), []);
  /** Актуальные значения на момент срабатывания отложенного сброса (не уводим режим/текст в дефолт). */
  const viewModeRef = useRef(viewMode);
  const textRef = useRef(text);
  viewModeRef.current = viewMode;
  textRef.current = text;

  const previewStateRef = useRef({});
  previewStateRef.current = {
    text,
    fontSize,
    glyphsFontSize,
    stylesFontSize,
    lineHeight,
    letterSpacing,
    stylesLetterSpacing,
    textColor,
    backgroundColor,
    viewMode,
    textDirection,
    textAlignment,
    textCase,
    textDecoration,
    listStyle,
    textColumns,
    textColumnGap,
    waterfallRows,
    waterfallBaseSize,
    waterfallEditTarget,
    waterfallHeadingPresetName,
    waterfallBodyPresetName,
    waterfallHeadingLineHeight,
    waterfallBodyLineHeight,
    waterfallHeadingLetterSpacing,
    waterfallBodyLetterSpacing,
    waterfallScaleRatio,
    waterfallUnit,
    waterfallRoundPx,
    verticalAlignment,
    textFill,
    textCenter,
    previewBackgroundImage,
  };

  const clearPendingReset = useCallback(() => {
    if (resetTimeoutRef.current != null) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
    setIsPendingReset(false);
    setPendingTargetFontId(null);
    setProgressActive(false);
  }, []);

  useEffect(() => () => clearPendingReset(), [clearPendingReset]);

  useEffect(() => {
    if (!isPendingReset) return undefined;
    const frameId = requestAnimationFrame(() => {
      setProgressActive(true);
    });
    return () => cancelAnimationFrame(frameId);
  }, [isPendingReset]);

  useEffect(() => {
    if (!isPendingReset) return;
    if (!selectedFont || pendingTargetFontId !== selectedFont.id) {
      clearPendingReset();
    }
  }, [clearPendingReset, isPendingReset, pendingTargetFontId, selectedFont]);

  const hasPreviewChanges = useMemo(() => {
    const currentPreviewSettings = {
      text,
      fontSize,
      glyphsFontSize,
      stylesFontSize,
      lineHeight,
      letterSpacing,
      stylesLetterSpacing,
      textColor,
      backgroundColor,
      viewMode,
      textDirection,
      textAlignment,
      textCase,
      textDecoration,
      listStyle,
      textColumns,
      textColumnGap,
      waterfallRows,
      waterfallBaseSize,
      waterfallEditTarget,
      waterfallHeadingPresetName,
      waterfallBodyPresetName,
      waterfallHeadingLineHeight,
      waterfallBodyLineHeight,
      waterfallHeadingLetterSpacing,
      waterfallBodyLetterSpacing,
      waterfallScaleRatio,
      waterfallUnit,
      waterfallRoundPx,
      verticalAlignment,
      textFill,
      previewBackgroundImage,
    };

    const keysForDirty =
      getPreviewResetKeysForViewMode(viewMode) ??
      new Set(Object.keys(defaultPreviewSettings).filter((k) => k !== 'viewMode' && k !== 'text'));

    return Object.entries(currentPreviewSettings).some(([key, value]) => {
      if (key === 'viewMode' || key === 'text') return false;
      if (!keysForDirty.has(key)) return false;
      if (key === 'previewBackgroundImage') {
        return value !== null;
      }
      return !areValuesEqual(value, defaultPreviewSettings[key]);
    });
  }, [
    backgroundColor,
    defaultPreviewSettings,
    fontSize,
    glyphsFontSize,
    letterSpacing,
    lineHeight,
    listStyle,
    previewBackgroundImage,
    stylesFontSize,
    stylesLetterSpacing,
    text,
    viewMode,
    textAlignment,
    textCase,
    textColor,
    textColumns,
    textColumnGap,
    textDecoration,
    textDirection,
    textFill,
    verticalAlignment,
    waterfallBaseSize,
    waterfallBodyLetterSpacing,
    waterfallBodyLineHeight,
    waterfallBodyPresetName,
    waterfallEditTarget,
    waterfallHeadingLetterSpacing,
    waterfallHeadingLineHeight,
    waterfallHeadingPresetName,
    waterfallRoundPx,
    waterfallRows,
    waterfallScaleRatio,
    waterfallUnit,
  ]);

  const hasFontSpecificChanges = useMemo(() => {
    if (!onResetSelectedFont || !selectedFont) return false;

    if (selectedFont.isVariableFont) {
      return hasVariableSettingsChanges(
        variableSettings,
        typeof getDefaultAxisValues === 'function' ? getDefaultAxisValues() : {},
      );
    }

    if (typeof getResetTargetPresetName !== 'function') return false;
    const resetTarget = getResetTargetPresetName(selectedFont);
    return typeof selectedPresetName === 'string' && selectedPresetName !== resetTarget;
  }, [
    getDefaultAxisValues,
    getResetTargetPresetName,
    onResetSelectedFont,
    selectedFont,
    selectedPresetName,
    variableSettings,
  ]);

  const hasResettableChanges = useMemo(() => {
    if (!onResetSelectedFont) return true;
    return hasPreviewChanges || hasFontSpecificChanges;
  }, [hasFontSpecificChanges, hasPreviewChanges, onResetSelectedFont]);

  const handleCancelPendingReset = useCallback(() => {
    clearPendingReset();
  }, [clearPendingReset]);

  const handleResetClick = useCallback(() => {
    if (isPendingReset) return;

    if (onResetSelectedFont) {
      if (!hasResettableChanges || !selectedFont) return;

      setIsPendingReset(true);
      setPendingTargetFontId(selectedFont.id);
      setProgressActive(false);
      resetTimeoutRef.current = window.setTimeout(() => {
        resetTimeoutRef.current = null;
        setIsPendingReset(false);
        setPendingTargetFontId(null);
        setProgressActive(false);
        if (hasPreviewChanges) {
          const cur = previewStateRef.current;
          const snapshotToApply = buildMergedResetSnapshot(
            defaultPreviewSettings,
            cur,
            viewModeRef.current,
          );
          applyPerFontPreviewSnapshot(snapshotToApply, {
            setText,
            setFontSize,
            setGlyphsFontSize,
            setStylesFontSize,
            setLineHeight,
            setLetterSpacing,
            setStylesLetterSpacing,
            setTextColor,
            setBackgroundColor,
            setViewMode,
            setTextDirection,
            setTextAlignment,
            setTextCase,
            setTextDecoration,
            setListStyle,
            setTextColumns,
            setTextColumnGap,
            setWaterfallRows,
            setWaterfallBaseSize,
            setWaterfallEditTarget,
            setWaterfallHeadingPresetName,
            setWaterfallBodyPresetName,
            setWaterfallHeadingLineHeight,
            setWaterfallBodyLineHeight,
            setWaterfallHeadingLetterSpacing,
            setWaterfallBodyLetterSpacing,
            setWaterfallScaleRatio,
            setWaterfallUnit,
            setWaterfallRoundPx,
            setVerticalAlignment,
            setTextFill,
            setTextCenter,
          });
          setPreviewBackgroundImage(snapshotToApply.previewBackgroundImage ?? null);
        }

        if (hasFontSpecificChanges) {
          onResetSelectedFont();
        } else if (hasPreviewChanges) {
          const modeLabel = getPerViewResetShortLabel(viewModeRef.current);
          toast.success(
            selectedFont?.name
              ? `${modeLabel}: «${selectedFont.name}»`
              : `${modeLabel}: настройки превью`,
          );
        }
      }, RESET_DELAY_MS);
      return;
    }

    if (window.confirm('Вы уверены, что хотите сбросить все настройки и удалить все локально сохраненные шрифты? Это действие необратимо.')) {
      try {
        resetSettings();
        resetApplicationState();
      } catch (error) {
        console.error('[ResetButton] Ошибка при выполнении сброса:', error);
        toast.error('Ошибка при сбросе приложения.');
      }
    }
  }, [
    defaultPreviewSettings,
    hasFontSpecificChanges,
    hasPreviewChanges,
    hasResettableChanges,
    isPendingReset,
    onResetSelectedFont,
    resetApplicationState,
    resetSettings,
    selectedFont,
    setBackgroundColor,
    setFontSize,
    setGlyphsFontSize,
    setLetterSpacing,
    setLineHeight,
    setListStyle,
    setPreviewBackgroundImage,
    setStylesFontSize,
    setStylesLetterSpacing,
    setText,
    setViewMode,
    setTextAlignment,
    setTextCase,
    setTextColor,
    setTextColumns,
    setTextColumnGap,
    setTextDecoration,
    setTextDirection,
    setTextFill,
    setTextCenter,
    setVerticalAlignment,
    setWaterfallBaseSize,
    setWaterfallBodyLetterSpacing,
    setWaterfallBodyLineHeight,
    setWaterfallBodyPresetName,
    setWaterfallEditTarget,
    setWaterfallHeadingLetterSpacing,
    setWaterfallHeadingLineHeight,
    setWaterfallHeadingPresetName,
    setWaterfallRoundPx,
    setWaterfallRows,
    setWaterfallScaleRatio,
    setWaterfallUnit,
    selectedFont,
  ]);

  const resetActionLabel = getPerViewResetShortLabel(viewMode);
  const buttonText = onResetSelectedFont ? resetActionLabel : 'Сбросить всё состояние';
  const title = isPendingReset
    ? 'Отменить запланированный сброс'
    : onResetSelectedFont
      ? hasResettableChanges
        ? `${resetActionLabel} — только настройки текущего режима превью`
        : 'Нет изменений для сброса в этом режиме'
      : 'Сбросить все настройки приложения и удалить локальные шрифты';

  if (isPendingReset && onResetSelectedFont) {
    return (
      <div className="relative w-full overflow-hidden rounded-md bg-gray-50">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 bg-accent origin-left transition-transform ease-linear"
          style={{
            width: '100%',
            transform: progressActive ? 'scaleX(1)' : 'scaleX(0)',
            transitionDuration: `${RESET_DELAY_MS}ms`,
          }}
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px" aria-hidden />
        <div className={`relative flex min-h-8 w-full items-center justify-center ${compact ? '' : 'px-2'}`}>
          {!compact ? (
            <span className="absolute left-2 text-xs font-semibold uppercase tracking-wide text-white">
              Сброс...
            </span>
          ) : null}
          <Tooltip content={title}>
            <button
              type="button"
              onClick={handleCancelPendingReset}
              className="relative flex h-6 w-6 items-center justify-center rounded-full text-accent transition-colors hover:text-accent"
              aria-label="Отменить сброс"
            >
              <CatalogSessionAddSpinner className="h-6 w-6 text-accent" />
              <CloseIcon className="absolute h-3 w-3 text-white" />
            </button>
          </Tooltip>
        </div>
      </div>
    );
  }

  return (
    <Tooltip content={title} className="w-full">
      <button
        type="button"
        onClick={handleResetClick}
        disabled={Boolean(onResetSelectedFont) && !hasResettableChanges}
        className={[
          compact
            ? 'inline-flex w-full min-h-8 items-center justify-center rounded-md border transition-colors'
            : 'w-full min-h-8 rounded-md px-3 text-center text-xs font-semibold uppercase transition-colors',
          compact
            ? onResetSelectedFont
              ? hasResettableChanges
                ? 'border-gray-200 bg-white text-gray-900 hover:border-black hover:bg-black hover:text-white'
                : 'cursor-default border-gray-200 bg-white text-gray-300'
              : 'border-gray-200 bg-white text-gray-400 hover:text-gray-800'
            : onResetSelectedFont
              ? hasResettableChanges
                ? 'text-accent hover:text-accent-hover'
                : 'cursor-default text-gray-300'
              : 'text-gray-400 hover:text-gray-800',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label={title}
      >
        {compact ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        ) : (
          buttonText
        )}
      </button>
    </Tooltip>
  );
}

export default ResetButton;
