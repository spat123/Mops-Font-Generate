import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { ENTIRE_PRINTABLE_ASCII_SAMPLE } from '../utils/previewSampleStrings';

const SettingsContext = createContext(null);

const LOCAL_STORAGE_KEYS = {
  /** Data URL фона области превью (может быть большим) */
  PREVIEW_BACKGROUND_IMAGE: 'previewBackgroundImage',
  BACKGROUND_COLOR: 'backgroundColor',
  TEXT_COLOR: 'textColor',
  FONT_SIZE: 'fontSize',
  LINE_HEIGHT: 'lineHeight',
  LETTER_SPACING: 'letterSpacing',
  VIEW_MODE: 'viewMode',
  TEXT_DIRECTION: 'textDirection',
  TEXT_ALIGNMENT: 'textAlignment',
  TEXT_CASE: 'textCase',
  TEXT_CENTER: 'textCenter',
  /** Вертикальное положение текста в превью: top | middle | bottom */
  VERTICAL_ALIGNMENT: 'verticalAlignment',
  TEXT_FILL: 'textFill',
};

const DEFAULT_SETTINGS = {
  TEXT: ENTIRE_PRINTABLE_ASCII_SAMPLE,
  FONT_SIZE: 150,
  LINE_HEIGHT: 1.05,
  LETTER_SPACING: 0,
  TEXT_COLOR: '#000000',
  BACKGROUND_COLOR: '#FFFFFF',
  VIEW_MODE: 'plain',
  TEXT_DIRECTION: 'ltr',
  TEXT_ALIGNMENT: 'left',
  /** Регистр превью: по умолчанию обычный (Аа). */
  TEXT_CASE: 'none',
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
    lineHeight: DEFAULT_SETTINGS.LINE_HEIGHT,
    letterSpacing: DEFAULT_SETTINGS.LETTER_SPACING,
    textColor: DEFAULT_SETTINGS.TEXT_COLOR,
    backgroundColor: DEFAULT_SETTINGS.BACKGROUND_COLOR,
    viewMode: DEFAULT_SETTINGS.VIEW_MODE,
    textDirection: DEFAULT_SETTINGS.TEXT_DIRECTION,
    textAlignment: DEFAULT_SETTINGS.TEXT_ALIGNMENT,
    textCase: DEFAULT_SETTINGS.TEXT_CASE,
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
  const [lineHeight, setLineHeight] = useState(DEFAULT_SETTINGS.LINE_HEIGHT);
  const [letterSpacing, setLetterSpacing] = useState(DEFAULT_SETTINGS.LETTER_SPACING);
  const [textColor, setTextColor] = useState(DEFAULT_SETTINGS.TEXT_COLOR);
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_SETTINGS.BACKGROUND_COLOR);
  const [viewMode, setViewMode] = useState(DEFAULT_SETTINGS.VIEW_MODE);
  const [textDirection, setTextDirection] = useState(DEFAULT_SETTINGS.TEXT_DIRECTION);
  const [textAlignment, setTextAlignment] = useState(DEFAULT_SETTINGS.TEXT_ALIGNMENT);
  const [textCase, setTextCase] = useState(DEFAULT_SETTINGS.TEXT_CASE);
  const [textCenter, setTextCenter] = useState(DEFAULT_SETTINGS.TEXT_CENTER);
  const [verticalAlignment, setVerticalAlignment] = useState(DEFAULT_SETTINGS.VERTICAL_ALIGNMENT);
  const [textFill, setTextFill] = useState(DEFAULT_SETTINGS.TEXT_FILL);
  /** Data URL изображения на фоне области превью или null */
  const [previewBackgroundImage, setPreviewBackgroundImage] = useState(null);

  useEffect(() => {
    setIsClient(true);
    setFontSize(getLocalStorageItem(LOCAL_STORAGE_KEYS.FONT_SIZE, DEFAULT_SETTINGS.FONT_SIZE));
    setLineHeight(getLocalStorageItem(LOCAL_STORAGE_KEYS.LINE_HEIGHT, DEFAULT_SETTINGS.LINE_HEIGHT));
    setLetterSpacing(getLocalStorageItem(LOCAL_STORAGE_KEYS.LETTER_SPACING, DEFAULT_SETTINGS.LETTER_SPACING));
    setTextColor(getLocalStorageItem(LOCAL_STORAGE_KEYS.TEXT_COLOR, DEFAULT_SETTINGS.TEXT_COLOR));
    setBackgroundColor(getLocalStorageItem(LOCAL_STORAGE_KEYS.BACKGROUND_COLOR, DEFAULT_SETTINGS.BACKGROUND_COLOR));
    setViewMode(getLocalStorageItem(LOCAL_STORAGE_KEYS.VIEW_MODE, DEFAULT_SETTINGS.VIEW_MODE));
    setTextDirection(getLocalStorageItem(LOCAL_STORAGE_KEYS.TEXT_DIRECTION, DEFAULT_SETTINGS.TEXT_DIRECTION));
    setTextAlignment(getLocalStorageItem(LOCAL_STORAGE_KEYS.TEXT_ALIGNMENT, DEFAULT_SETTINGS.TEXT_ALIGNMENT));
    setTextCase(getLocalStorageItem(LOCAL_STORAGE_KEYS.TEXT_CASE, DEFAULT_SETTINGS.TEXT_CASE));
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
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.LINE_HEIGHT, lineHeight);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.LETTER_SPACING, letterSpacing);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.VIEW_MODE, viewMode);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.TEXT_DIRECTION, textDirection);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.TEXT_ALIGNMENT, textAlignment);
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.TEXT_CASE, textCase);
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
    setLineHeight(DEFAULT_SETTINGS.LINE_HEIGHT);
    setLetterSpacing(DEFAULT_SETTINGS.LETTER_SPACING);
    setTextColor(DEFAULT_SETTINGS.TEXT_COLOR);
    setBackgroundColor(DEFAULT_SETTINGS.BACKGROUND_COLOR);
    setViewMode(DEFAULT_SETTINGS.VIEW_MODE);
    setTextDirection(DEFAULT_SETTINGS.TEXT_DIRECTION);
    setTextAlignment(DEFAULT_SETTINGS.TEXT_ALIGNMENT);
    setTextCase(DEFAULT_SETTINGS.TEXT_CASE);
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
    lineHeight,
    setLineHeight,
    letterSpacing,
    setLetterSpacing,
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
