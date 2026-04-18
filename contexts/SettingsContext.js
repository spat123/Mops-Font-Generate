import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const SettingsContext = createContext(null);

const LOCAL_STORAGE_KEYS = {
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
  TEXT_FILL: 'textFill',
};

const DEFAULT_SETTINGS = {
  TEXT: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  FONT_SIZE: 150,
  LINE_HEIGHT: 1.05,
  LETTER_SPACING: 0,
  TEXT_COLOR: '#000000',
  BACKGROUND_COLOR: '#FFFFFF',
  VIEW_MODE: 'plain',
  TEXT_DIRECTION: 'ltr',
  TEXT_ALIGNMENT: 'left',
  TEXT_CASE: 'uppercase',
  TEXT_CENTER: false,
  TEXT_FILL: false,
};

/** Текст превью по умолчанию (как при сбросе настроек). */
export const DEFAULT_PREVIEW_TEXT = DEFAULT_SETTINGS.TEXT;

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
  const [textFill, setTextFill] = useState(DEFAULT_SETTINGS.TEXT_FILL);

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
    setTextCenter(getLocalStorageItem(LOCAL_STORAGE_KEYS.TEXT_CENTER, DEFAULT_SETTINGS.TEXT_CENTER));
    setTextFill(getLocalStorageItem(LOCAL_STORAGE_KEYS.TEXT_FILL, DEFAULT_SETTINGS.TEXT_FILL));
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
  useSyncSettingToStorage(isClient, LOCAL_STORAGE_KEYS.TEXT_FILL, textFill);

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
    setTextFill(DEFAULT_SETTINGS.TEXT_FILL);

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
    textFill,
    setTextFill,
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
