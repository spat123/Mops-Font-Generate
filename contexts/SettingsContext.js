import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

// Создаем контекст
const SettingsContext = createContext();

// <<< Ключи для localStorage >>>
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
  TEXT_FILL: 'textFill'
  // Добавьте другие ключи при необходимости
};

// <<< Дефолтные значения >>>
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
  TEXT_FILL: false
};

// <<< Функция для безопасного чтения из localStorage >>>
const getLocalStorageItem = (key, defaultValue) => {
  if (typeof window !== 'undefined') { // Убедимся, что localStorage доступен (не на сервере)
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Ошибка чтения localStorage для ключа ${key}:`, error);
      return defaultValue;
    }
  } else {
      return defaultValue;
  }
};

// <<< Функция для безопасной записи в localStorage >>>
const setLocalStorageItem = (key, value) => {
   if (typeof window !== 'undefined') {
       try {
           localStorage.setItem(key, JSON.stringify(value));
       } catch (error) {
           console.error(`Ошибка записи в localStorage для ключа ${key}:`, error);
       }
   }
};

// Создаем провайдер контекста
export const SettingsProvider = ({ children }) => {
  // Состояние для отслеживания клиентской стороны (предотвращение гидратации)
  const [isClient, setIsClient] = useState(false);
  
  // Переносим состояния из pages/index.jsx
  const [text, setText] = useState(DEFAULT_SETTINGS.TEXT); // Текст не храним в LS пока
  const [fontSize, setFontSize] = useState(DEFAULT_SETTINGS.FONT_SIZE); // Инициализируем дефолтом
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
  
  // Эффект для инициализации клиентской стороны и загрузки из localStorage
  useEffect(() => {
    setIsClient(true);
    
    // Загружаем значения из localStorage только на клиенте
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

  // <<< useEffects для сохранения в localStorage (только после клиентской инициализации) >>>
  useEffect(() => { if (isClient) setLocalStorageItem(LOCAL_STORAGE_KEYS.BACKGROUND_COLOR, backgroundColor); }, [backgroundColor, isClient]);
  useEffect(() => { if (isClient) setLocalStorageItem(LOCAL_STORAGE_KEYS.TEXT_COLOR, textColor); }, [textColor, isClient]);
  useEffect(() => { if (isClient) setLocalStorageItem(LOCAL_STORAGE_KEYS.FONT_SIZE, fontSize); }, [fontSize, isClient]);
  useEffect(() => { if (isClient) setLocalStorageItem(LOCAL_STORAGE_KEYS.LINE_HEIGHT, lineHeight); }, [lineHeight, isClient]);
  useEffect(() => { if (isClient) setLocalStorageItem(LOCAL_STORAGE_KEYS.LETTER_SPACING, letterSpacing); }, [letterSpacing, isClient]);
  useEffect(() => { if (isClient) setLocalStorageItem(LOCAL_STORAGE_KEYS.VIEW_MODE, viewMode); }, [viewMode, isClient]);
  useEffect(() => { if (isClient) setLocalStorageItem(LOCAL_STORAGE_KEYS.TEXT_DIRECTION, textDirection); }, [textDirection, isClient]);
  useEffect(() => { if (isClient) setLocalStorageItem(LOCAL_STORAGE_KEYS.TEXT_ALIGNMENT, textAlignment); }, [textAlignment, isClient]);
  useEffect(() => { if (isClient) setLocalStorageItem(LOCAL_STORAGE_KEYS.TEXT_CASE, textCase); }, [textCase, isClient]);
  useEffect(() => { if (isClient) setLocalStorageItem(LOCAL_STORAGE_KEYS.TEXT_CENTER, textCenter); }, [textCenter, isClient]);
  useEffect(() => { if (isClient) setLocalStorageItem(LOCAL_STORAGE_KEYS.TEXT_FILL, textFill); }, [textFill, isClient]);

  // <<< Функция сброса настроек >>>
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

    // Очищаем localStorage
    Object.values(LOCAL_STORAGE_KEYS).forEach(key => {
      if (typeof window !== 'undefined') localStorage.removeItem(key);
    });
    console.log('[SettingsContext] Настройки сброшены к дефолтным и localStorage очищен.');
  }, []); // Нет зависимостей, т.к. используем только сеттеры и константы

  // Значение, которое будет передано через контекст
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

// Хук для удобного использования контекста
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}; 