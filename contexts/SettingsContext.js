import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { ENTIRE_PRINTABLE_ASCII_SAMPLE } from '../utils/previewSampleStrings';

const SettingsContext = createContext(null);

const LOCAL_STORAGE_KEYS = {
  /** Data URL фона области превью (может быть большим) */
  PREVIEW_BACKGROUND_IMAGE: 'previewBackgroundImage',
  BACKGROUND_COLOR: 'backgroundColor',
  TEXT_COLOR: 'textColor',
  FONT_SIZE: 'fontSize',
  GLYPHS_FONT_SIZE: 'glyphsFontSize',
  STYLES_FONT_SIZE: 'stylesFontSize',
  LINE_HEIGHT: 'lineHeight',
  LETTER_SPACING: 'letterSpacing',
  STYLES_LETTER_SPACING: 'stylesLetterSpacing',
  VIEW_MODE: 'viewMode',
  TEXT_DIRECTION: 'textDirection',
  TEXT_ALIGNMENT: 'textAlignment',
  TEXT_CASE: 'textCase',
  TEXT_DECORATION: 'textDecoration',
  LIST_STYLE: 'listStyle',
  TEXT_COLUMNS: 'textColumns',
  TEXT_COLUMN_GAP: 'textColumnGap',
  WATERFALL_ROWS: 'waterfallRows',
  WATERFALL_BASE_SIZE: 'waterfallBaseSize',
  WATERFALL_EDIT_TARGET: 'waterfallEditTarget',
  WATERFALL_HEADING_PRESET_NAME: 'waterfallHeadingPresetName',
  WATERFALL_BODY_PRESET_NAME: 'waterfallBodyPresetName',
  WATERFALL_HEADING_LINE_HEIGHT: 'waterfallHeadingLineHeight',
  WATERFALL_BODY_LINE_HEIGHT: 'waterfallBodyLineHeight',
  WATERFALL_HEADING_LETTER_SPACING: 'waterfallHeadingLetterSpacing',
  WATERFALL_BODY_LETTER_SPACING: 'waterfallBodyLetterSpacing',
  WATERFALL_SCALE_RATIO: 'waterfallScaleRatio',
  WATERFALL_UNIT: 'waterfallUnit',
  WATERFALL_ROUND_PX: 'waterfallRoundPx',
  TEXT_CENTER: 'textCenter',
  /** Вертикальное положение текста в превью: top | middle | bottom */
  VERTICAL_ALIGNMENT: 'verticalAlignment',
  TEXT_FILL: 'textFill',
};

const DEFAULT_SETTINGS = {
  TEXT: ENTIRE_PRINTABLE_ASCII_SAMPLE,
  FONT_SIZE: 150,
  GLYPHS_FONT_SIZE: 150,
  STYLES_FONT_SIZE: 150,
  LINE_HEIGHT: 1.05,
  LETTER_SPACING: 0,
  STYLES_LETTER_SPACING: 0,
  TEXT_COLOR: '#000000',
  BACKGROUND_COLOR: '#FFFFFF',
  VIEW_MODE: 'plain',
  TEXT_DIRECTION: 'ltr',
  TEXT_ALIGNMENT: 'left',
  /** Регистр превью: по умолчанию обычный (Аа). */
  TEXT_CASE: 'none',
  /** @type {'none'|'underline'|'line-through'} */
  TEXT_DECORATION: 'none',
  /** @type {'none'|'bullet'|'numbered'} */
  LIST_STYLE: 'none',
  /** Колонки текста в превью (CSS columns). */
  TEXT_COLUMNS: 1,
  /** Межколоночный отступ в px. */
  TEXT_COLUMN_GAP: 24,
  /** Количество строк в режиме Waterfall. */
  WATERFALL_ROWS: 10,
  /** Базовый размер первой строки Waterfall (в px). */
  WATERFALL_BASE_SIZE: 160,
  /** Какая группа настроек редактируется в сайдбаре для Waterfall. */
  WATERFALL_EDIT_TARGET: 'heading',
  /** Пресет начертания для H-строк в Waterfall. */
  WATERFALL_HEADING_PRESET_NAME: 'Regular',
  /** Пресет начертания для Body-строк в Waterfall. */
  WATERFALL_BODY_PRESET_NAME: 'Regular',
  /** Line-height для H-строк в Waterfall. */
  WATERFALL_HEADING_LINE_HEIGHT: 1.05,
  /** Line-height для Body-строк (P/Small и ниже) в Waterfall. */
  WATERFALL_BODY_LINE_HEIGHT: 1.05,
  /** Letter spacing для H-строк в Waterfall (в тех же единицах, что и общий letterSpacing: -100..100). */
  WATERFALL_HEADING_LETTER_SPACING: 0,
  /** Letter spacing для Body-строк (P/Small и ниже) в Waterfall. */
  WATERFALL_BODY_LETTER_SPACING: 0,
  /** Коэффициент модульной шкалы (шаг между строками Waterfall). */
  WATERFALL_SCALE_RATIO: 1.25,
  /** Единицы для подписи размеров в Waterfall. */
  WATERFALL_UNIT: 'px',
  /** Округлять рассчитанные размеры Waterfall до целых px. */
  WATERFALL_ROUND_PX: true,
  TEXT_CENTER: false,
  /** @type {'top'|'middle'|'bottom'} */
  VERTICAL_ALIGNMENT: 'top',
  TEXT_FILL: false,
};

/** Текст превью по умолчанию (как при сбросе настроек). */
export const DEFAULT_PREVIEW_TEXT = DEFAULT_SETTINGS.TEXT;

/** Снимок настроек превью по умолчанию (совместим с applyPerFontPreviewSnapshot в utils/perFontPreviewSettings). */
export function getDefaultPreviewSettingsSnapshot() {
  return {
    text: DEFAULT_SETTINGS.TEXT,
    fontSize: DEFAULT_SETTINGS.FONT_SIZE,
    glyphsFontSize: DEFAULT_SETTINGS.GLYPHS_FONT_SIZE,
    stylesFontSize: DEFAULT_SETTINGS.STYLES_FONT_SIZE,
    lineHeight: DEFAULT_SETTINGS.LINE_HEIGHT,
    letterSpacing: DEFAULT_SETTINGS.LETTER_SPACING,
    stylesLetterSpacing: DEFAULT_SETTINGS.STYLES_LETTER_SPACING,
    textColor: DEFAULT_SETTINGS.TEXT_COLOR,
    backgroundColor: DEFAULT_SETTINGS.BACKGROUND_COLOR,
    viewMode: DEFAULT_SETTINGS.VIEW_MODE,
    textDirection: DEFAULT_SETTINGS.TEXT_DIRECTION,
    textAlignment: DEFAULT_SETTINGS.TEXT_ALIGNMENT,
    textCase: DEFAULT_SETTINGS.TEXT_CASE,
    textDecoration: DEFAULT_SETTINGS.TEXT_DECORATION,
    listStyle: DEFAULT_SETTINGS.LIST_STYLE,
    textColumns: DEFAULT_SETTINGS.TEXT_COLUMNS,
    textColumnGap: DEFAULT_SETTINGS.TEXT_COLUMN_GAP,
    waterfallRows: DEFAULT_SETTINGS.WATERFALL_ROWS,
    waterfallBaseSize: DEFAULT_SETTINGS.WATERFALL_BASE_SIZE,
    waterfallEditTarget: DEFAULT_SETTINGS.WATERFALL_EDIT_TARGET,
    waterfallHeadingPresetName: DEFAULT_SETTINGS.WATERFALL_HEADING_PRESET_NAME,
    waterfallBodyPresetName: DEFAULT_SETTINGS.WATERFALL_BODY_PRESET_NAME,
    waterfallHeadingLineHeight: DEFAULT_SETTINGS.WATERFALL_HEADING_LINE_HEIGHT,
    waterfallBodyLineHeight: DEFAULT_SETTINGS.WATERFALL_BODY_LINE_HEIGHT,
    waterfallHeadingLetterSpacing: DEFAULT_SETTINGS.WATERFALL_HEADING_LETTER_SPACING,
    waterfallBodyLetterSpacing: DEFAULT_SETTINGS.WATERFALL_BODY_LETTER_SPACING,
    waterfallScaleRatio: DEFAULT_SETTINGS.WATERFALL_SCALE_RATIO,
    waterfallUnit: DEFAULT_SETTINGS.WATERFALL_UNIT,
    waterfallRoundPx: DEFAULT_SETTINGS.WATERFALL_ROUND_PX,
    textCenter: DEFAULT_SETTINGS.TEXT_CENTER,
    verticalAlignment: DEFAULT_SETTINGS.VERTICAL_ALIGNMENT,
    textFill: DEFAULT_SETTINGS.TEXT_FILL,
    previewBackgroundImage: null,
  };
}

const getLocalStorageItem = (key, defaultValue) => {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Ошибка чтения localStorage для ключа ${key}:`, error);
    return defaultValue;
  }
};

const setLocalStorageItem = (key, value) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Ошибка записи в localStorage для ключа ${key}:`, error);
  }
};

/** Пишет одно поле в localStorage после гидратации (отдельный эффект на поле). */
function useSyncSettingToStorage(isClient, storageKey, value) {
  useEffect(() => {
    if (!isClient) return;
    setLocalStorageItem(storageKey, value);
  }, [isClient, storageKey, value]);
}

export const SettingsProvider = ({ children }) => {
  const [isClient, setIsClient] = useState(false);

  const [text, setText] = useState(DEFAULT_SETTINGS.TEXT);
  const [fontSize, setFontSize] = useState(DEFAULT_SETTINGS.FONT_SIZE);
  const [glyphsFontSize, setGlyphsFontSize] = useState(DEFAULT_SETTINGS.GLYPHS_FONT_SIZE);
  const [stylesFontSize, setStylesFontSize] = useState(DEFAULT_SETTINGS.STYLES_FONT_SIZE);
  const [lineHeight, setLineHeight] = useState(DEFAULT_SETTINGS.LINE_HEIGHT);
  const [letterSpacing, setLetterSpacing] = useState(DEFAULT_SETTINGS.LETTER_SPACING);
  const [stylesLetterSpacing, setStylesLetterSpacing] = useState(DEFAULT_SETTINGS.STYLES_LETTER_SPACING);
  const [textColor, setTextColor] = useState(DEFAULT_SETTINGS.TEXT_COLOR);
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_SETTINGS.BACKGROUND_COLOR);
  const [viewMode, setViewMode] = useState(DEFAULT_SETTINGS.VIEW_MODE);
  const [textDirection, setTextDirection] = useState(DEFAULT_SETTINGS.TEXT_DIRECTION);
  const [textAlignment, setTextAlignment] = useState(DEFAULT_SETTINGS.TEXT_ALIGNMENT);
  const [textCase, setTextCase] = useState(DEFAULT_SETTINGS.TEXT_CASE);
  const [textDecoration, setTextDecoration] = useState(DEFAULT_SETTINGS.TEXT_DECORATION);
  const [listStyle, setListStyle] = useState(DEFAULT_SETTINGS.LIST_STYLE);
  const [textColumns, setTextColumns] = useState(DEFAULT_SETTINGS.TEXT_COLUMNS);
  const [textColumnGap, setTextColumnGap] = useState(DEFAULT_SETTINGS.TEXT_COLUMN_GAP);
  const [waterfallRows, setWaterfallRows] = useState(DEFAULT_SETTINGS.WATERFALL_ROWS);
  const [waterfallBaseSize, setWaterfallBaseSize] = useState(DEFAULT_SETTINGS.WATERFALL_BASE_SIZE);
  const [waterfallEditTarget, setWaterfallEditTarget] = useState(DEFAULT_SETTINGS.WATERFALL_EDIT_TARGET);
  const [waterfallHeadingPresetName, setWaterfallHeadingPresetName] = useState(DEFAULT_SETTINGS.WATERFALL_HEADING_PRESET_NAME);
  const [waterfallBodyPresetName, setWaterfallBodyPresetName] = useState(DEFAULT_SETTINGS.WATERFALL_BODY_PRESET_NAME);
  const [waterfallHeadingLineHeight, setWaterfallHeadingLineHeight] = useState(DEFAULT_SETTINGS.WATERFALL_HEADING_LINE_HEIGHT);
  const [waterfallBodyLineHeight, setWaterfallBodyLineHeight] = useState(DEFAULT_SETTINGS.WATERFALL_BODY_LINE_HEIGHT);
  const [waterfallHeadingLetterSpacing, setWaterfallHeadingLetterSpacing] = useState(DEFAULT_SETTINGS.WATERFALL_HEADING_LETTER_SPACING);
  const [waterfallBodyLetterSpacing, setWaterfallBodyLetterSpacing] = useState(DEFAULT_SETTINGS.WATERFALL_BODY_LETTER_SPACING);
  const [waterfallScaleRatio, setWaterfallScaleRatio] = useState(DEFAULT_SETTINGS.WATERFALL_SCALE_RATIO);
  const [waterfallUnit, setWaterfallUnit] = useState(DEFAULT_SETTINGS.WATERFALL_UNIT);
  const [waterfallRoundPx, setWaterfallRoundPx] = useState(DEFAULT_SETTINGS.WATERFALL_ROUND_PX);
  const [textCenter, setTextCenter] = useState(DEFAULT_SETTINGS.TEXT_CENTER);
  const [verticalAlignment, setVerticalAlignment] = useState(DEFAULT_SETTINGS.VERTICAL_ALIGNMENT);
  const [textFill, setTextFill] = useState(DEFAULT_SETTINGS.TEXT_FILL);
  /** Data URL изображения на фоне области превью или null */
  const [previewBackgroundImage, setPreviewBackgroundImage] = useState(null);

  useEffect(() => {
    setIsClient(true);
    setFontSize(getLocalStorageItem(LOCAL_STORAGE_KEYS.FONT_SIZE, DEFAULT_SETTINGS.FONT_SIZE));
    setGlyphsFontSize(
      getLocalStorageItem(LOCAL_STORAGE_KEYS.GLYPHS_FONT_SIZE, DEFAULT_SETTINGS.GLYPHS_FONT_SIZE),
    );
    setStylesFontSize(
      getLocalStorageItem(LOCAL_STORAGE_KEYS.STYLES_FONT_SIZE, DEFAULT_SETTINGS.STYLES_FONT_SIZE),
    );
    setLineHeight(getLocalStorageItem(LOCAL_STORAGE_KEYS.LINE_HEIGHT, DEFAULT_SETTINGS.LINE_HEIGHT));
    setLetterSpacing(getLocalStorageItem(LOCAL_STORAGE_KEYS.LETTER_SPACING, DEFAULT_SETTINGS.LETTER_SPACING));
    setStylesLetterSpacing(
      getLocalStorageItem(LOCAL_STORAGE_KEYS.STYLES_LETTER_SPACING, DEFAULT_SETTINGS.STYLES_LETTER_SPACING),
    );
    setTextColor(getLocalStorageItem(LOCAL_STORAGE_KEYS.TEXT_COLOR, DEFAULT_SETTINGS.TEXT_COLOR));
    setBackgroundColor(getLocalStorageItem(LOCAL_STORAGE_KEYS.BACKGROUND_COLOR, DEFAULT_SETTINGS.BACKGROUND_COLOR));
    setViewMode(getLocalStorageItem(LOCAL_STORAGE_KEYS.VIEW_MODE, DEFAULT_SETTINGS.VIEW_MODE));
    setTextDirection(getLocalStorageItem(LOCAL_STORAGE_KEYS.TEXT_DIRECTION, DEFAULT_SETTINGS.TEXT_DIRECTION));
    setTextAlignment(getLocalStorageItem(LOCAL_STORAGE_KEYS.TEXT_ALIGNMENT, DEFAULT_SETTINGS.TEXT_ALIGNMENT));
    setTextCase(getLocalStorageItem(LOCAL_STORAGE_KEYS.TEXT_CASE, DEFAULT_SETTINGS.TEXT_CASE));
    setTextDecoration(getLocalStorageItem(LOCAL_STORAGE_KEYS.TEXT_DECORATION, DEFAULT_SETTINGS.TEXT_DECORATION));
    setListStyle(getLocalStorageItem(LOCAL_STORAGE_KEYS.LIST_STYLE, DEFAULT_SETTINGS.LIST_STYLE));
    setTextColumns(
      Number(getLocalStorageItem(LOCAL_STORAGE_KEYS.TEXT_COLUMNS, DEFAULT_SETTINGS.TEXT_COLUMNS)) || 1,
    );
    setTextColumnGap(
      Number(getLocalStorageItem(LOCAL_STORAGE_KEYS.TEXT_COLUMN_GAP, DEFAULT_SETTINGS.TEXT_COLUMN_GAP)) || 24,
    );
    setWaterfallRows(
      Number(getLocalStorageItem(LOCAL_STORAGE_KEYS.WATERFALL_ROWS, DEFAULT_SETTINGS.WATERFALL_ROWS)) ||
        DEFAULT_SETTINGS.WATERFALL_ROWS,
    );
    setWaterfallBaseSize(
      Number(getLocalStorageItem(LOCAL_STORAGE_KEYS.WATERFALL_BASE_SIZE, DEFAULT_SETTINGS.WATERFALL_BASE_SIZE)) ||
        DEFAULT_SETTINGS.WATERFALL_BASE_SIZE,
    );
    const wet = getLocalStorageItem(LOCAL_STORAGE_KEYS.WATERFALL_EDIT_TARGET, DEFAULT_SETTINGS.WATERFALL_EDIT_TARGET);
    setWaterfallEditTarget(wet === 'heading' || wet === 'body' ? wet : DEFAULT_SETTINGS.WATERFALL_EDIT_TARGET);
    setWaterfallHeadingPresetName(
      getLocalStorageItem(
        LOCAL_STORAGE_KEYS.WATERFALL_HEADING_PRESET_NAME,
        DEFAULT_SETTINGS.WATERFALL_HEADING_PRESET_NAME,
      ) || DEFAULT_SETTINGS.WATERFALL_HEADING_PRESET_NAME,
    );
    setWaterfallBodyPresetName(
      getLocalStorageItem(
        LOCAL_STORAGE_KEYS.WATERFALL_BODY_PRESET_NAME,
        DEFAULT_SETTINGS.WATERFALL_BODY_PRESET_NAME,
      ) || DEFAULT_SETTINGS.WATERFALL_BODY_PRESET_NAME,
    );
    setWaterfallHeadingLineHeight(
      Number(getLocalStorageItem(LOCAL_STORAGE_KEYS.WATERFALL_HEADING_LINE_HEIGHT, DEFAULT_SETTINGS.WATERFALL_HEADING_LINE_HEIGHT)) ||
        DEFAULT_SETTINGS.WATERFALL_HEADING_LINE_HEIGHT,
    );
    setWaterfallBodyLineHeight(
      Number(getLocalStorageItem(LOCAL_STORAGE_KEYS.WATERFALL_BODY_LINE_HEIGHT, DEFAULT_SETTINGS.WATERFALL_BODY_LINE_HEIGHT)) ||
        DEFAULT_SETTINGS.WATERFALL_BODY_LINE_HEIGHT,
    );
    setWaterfallHeadingLetterSpacing(
      Number(getLocalStorageItem(LOCAL_STORAGE_KEYS.WATERFALL_HEADING_LETTER_SPACING, DEFAULT_SETTINGS.WATERFALL_HEADING_LETTER_SPACING)) ||
        DEFAULT_SETTINGS.WATERFALL_HEADING_LETTER_SPACING,
    );
    setWaterfallBodyLetterSpacing(
      Number(getLocalStorageItem(LOCAL_STORAGE_KEYS.WATERFALL_BODY_LETTER_SPACING, DEFAULT_SETTINGS.WATERFALL_BODY_LETTER_SPACING)) ||
        DEFAULT_SETTINGS.WATERFALL_BODY_LETTER_SPACING,
    );
    setWaterfallScaleRatio(
      Number(getLocalStorageItem(LOCAL_STORAGE_KEYS.WATERFALL_SCALE_RATIO, DEFAULT_SETTINGS.WATERFALL_SCALE_RATIO)) ||
        DEFAULT_SETTINGS.WATERFALL_SCALE_RATIO,
    );
    const wu = getLocalStorageItem(LOCAL_STORAGE_KEYS.WATERFALL_UNIT, DEFAULT_SETTINGS.WATERFALL_UNIT);
    setWaterfallUnit(wu === 'px' || wu === 'rem' || wu === 'pt' ? wu : DEFAULT_SETTINGS.WATERFALL_UNIT);
    const wr = getLocalStorageItem(LOCAL_STORAGE_KEYS.WATERFALL_ROUND_PX, DEFAULT_SETTINGS.WATERFALL_ROUND_PX);
    setWaterfallRoundPx(Boolean(wr));
    const storedVa = getLocalStorageItem(LOCAL_STORAGE_KEYS.VERTICAL_ALIGNMENT, null);
    let va = DEFAULT_SETTINGS.VERTICAL_ALIGNMENT;
    if (storedVa === 'top' || storedVa === 'middle' || storedVa === 'bottom') {
      va = storedVa;
    } else {
      const legacyCenter = getLocalStorageItem(LOCAL_STORAGE_KEYS.TEXT_CENTER, DEFAULT_SETTINGS.TEXT_CENTER);
      va = legacyCenter ? 'middle' : 'top';
    }
    setVerticalAlignment(va);
    setTextFill(getLocalStorageItem(LOCAL_STORAGE_KEYS.TEXT_FILL, DEFAULT_SETTINGS.TEXT_FILL));
    const img = getLocalStorageItem(LOCAL_STORAGE_KEYS.PREVIEW_BACKGROUND_IMAGE, null);
    setPreviewBackgroundImage(typeof img === 'string' && img.length > 0 ? img : null);
  }, []);

  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.BACKGROUND_COLOR, backgroundColor);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.TEXT_COLOR, textColor);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.FONT_SIZE, fontSize);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.GLYPHS_FONT_SIZE, glyphsFontSize);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.STYLES_FONT_SIZE, stylesFontSize);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.LINE_HEIGHT, lineHeight);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.LETTER_SPACING, letterSpacing);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.STYLES_LETTER_SPACING, stylesLetterSpacing);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.VIEW_MODE, viewMode);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.TEXT_DIRECTION, textDirection);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.TEXT_ALIGNMENT, textAlignment);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.TEXT_CASE, textCase);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.TEXT_DECORATION, textDecoration);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.LIST_STYLE, listStyle);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.TEXT_COLUMNS, textColumns);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.TEXT_COLUMN_GAP, textColumnGap);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.WATERFALL_ROWS, waterfallRows);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.WATERFALL_BASE_SIZE, waterfallBaseSize);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.WATERFALL_EDIT_TARGET, waterfallEditTarget);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.WATERFALL_HEADING_PRESET_NAME, waterfallHeadingPresetName);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.WATERFALL_BODY_PRESET_NAME, waterfallBodyPresetName);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.WATERFALL_HEADING_LINE_HEIGHT, waterfallHeadingLineHeight);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.WATERFALL_BODY_LINE_HEIGHT, waterfallBodyLineHeight);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.WATERFALL_HEADING_LETTER_SPACING, waterfallHeadingLetterSpacing);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.WATERFALL_BODY_LETTER_SPACING, waterfallBodyLetterSpacing);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.WATERFALL_SCALE_RATIO, waterfallScaleRatio);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.WATERFALL_UNIT, waterfallUnit);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.WATERFALL_ROUND_PX, waterfallRoundPx);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.TEXT_CENTER, textCenter);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.VERTICAL_ALIGNMENT, verticalAlignment);

  useEffect(() => {
    setTextCenter(verticalAlignment === 'middle');
  }, [verticalAlignment, setTextCenter]);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.TEXT_FILL, textFill);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.PREVIEW_BACKGROUND_IMAGE, previewBackgroundImage);

  const resetSettings = useCallback(() => {
    setText(DEFAULT_SETTINGS.TEXT);
    setFontSize(DEFAULT_SETTINGS.FONT_SIZE);
    setGlyphsFontSize(DEFAULT_SETTINGS.GLYPHS_FONT_SIZE);
    setStylesFontSize(DEFAULT_SETTINGS.STYLES_FONT_SIZE);
    setLineHeight(DEFAULT_SETTINGS.LINE_HEIGHT);
    setLetterSpacing(DEFAULT_SETTINGS.LETTER_SPACING);
    setStylesLetterSpacing(DEFAULT_SETTINGS.STYLES_LETTER_SPACING);
    setTextColor(DEFAULT_SETTINGS.TEXT_COLOR);
    setBackgroundColor(DEFAULT_SETTINGS.BACKGROUND_COLOR);
    setViewMode(DEFAULT_SETTINGS.VIEW_MODE);
    setTextDirection(DEFAULT_SETTINGS.TEXT_DIRECTION);
    setTextAlignment(DEFAULT_SETTINGS.TEXT_ALIGNMENT);
    setTextCase(DEFAULT_SETTINGS.TEXT_CASE);
    setTextDecoration(DEFAULT_SETTINGS.TEXT_DECORATION);
    setListStyle(DEFAULT_SETTINGS.LIST_STYLE);
    setTextColumns(DEFAULT_SETTINGS.TEXT_COLUMNS);
    setTextColumnGap(DEFAULT_SETTINGS.TEXT_COLUMN_GAP);
    setWaterfallRows(DEFAULT_SETTINGS.WATERFALL_ROWS);
    setWaterfallBaseSize(DEFAULT_SETTINGS.WATERFALL_BASE_SIZE);
    setWaterfallEditTarget(DEFAULT_SETTINGS.WATERFALL_EDIT_TARGET);
    setWaterfallHeadingPresetName(DEFAULT_SETTINGS.WATERFALL_HEADING_PRESET_NAME);
    setWaterfallBodyPresetName(DEFAULT_SETTINGS.WATERFALL_BODY_PRESET_NAME);
    setWaterfallHeadingLineHeight(DEFAULT_SETTINGS.WATERFALL_HEADING_LINE_HEIGHT);
    setWaterfallBodyLineHeight(DEFAULT_SETTINGS.WATERFALL_BODY_LINE_HEIGHT);
    setWaterfallHeadingLetterSpacing(DEFAULT_SETTINGS.WATERFALL_HEADING_LETTER_SPACING);
    setWaterfallBodyLetterSpacing(DEFAULT_SETTINGS.WATERFALL_BODY_LETTER_SPACING);
    setWaterfallScaleRatio(DEFAULT_SETTINGS.WATERFALL_SCALE_RATIO);
    setWaterfallUnit(DEFAULT_SETTINGS.WATERFALL_UNIT);
    setWaterfallRoundPx(DEFAULT_SETTINGS.WATERFALL_ROUND_PX);
    setTextCenter(DEFAULT_SETTINGS.TEXT_CENTER);
    setVerticalAlignment(DEFAULT_SETTINGS.VERTICAL_ALIGNMENT);
    setTextFill(DEFAULT_SETTINGS.TEXT_FILL);
    setPreviewBackgroundImage(null);

    Object.values(LOCAL_STORAGE_KEYS).forEach((key) => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
    });
  }, []);

  const value = {
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
    textCenter,
    setTextCenter,
    verticalAlignment,
    setVerticalAlignment,
    textFill,
    setTextFill,
    previewBackgroundImage,
    setPreviewBackgroundImage,
    resetSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
