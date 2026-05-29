import type { Dispatch, SetStateAction } from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type VerticalAlignment = 'top' | 'middle' | 'bottom';
export type WaterfallEditTarget = 'heading' | 'body';
export type WaterfallUnit = 'px' | 'rem' | 'pt';
export type TextDecoration = 'none' | 'underline' | 'line-through';
export type ListStyle = 'none' | 'bullet' | 'numbered';

/** Снимок настроек превью (совместим с perFontPreviewSettings). */
export type PreviewSettingsSnapshot = {
  text: string;
  fontSize: number;
  glyphsFontSize: number;
  stylesFontSize: number;
  lineHeight: number;
  letterSpacing: number;
  stylesLetterSpacing: number;
  /**
   * Явные переопределения OpenType-фич (CSS `font-feature-settings`).
   * Ключ — 4-символьный тег (e.g. "ss01"), значение 0/1.
   * Пустой объект означает `font-feature-settings: normal`.
   */
  openTypeFeatureOverrides: Record<string, 0 | 1>;
  textColor: string;
  backgroundColor: string;
  viewMode: string;
  textDirection: string;
  textAlignment: string;
  textCase: string;
  textDecoration: TextDecoration;
  listStyle: ListStyle;
  textColumns: number;
  textColumnGap: number;
  waterfallRows: number;
  waterfallBaseSize: number;
  waterfallEditTarget: WaterfallEditTarget;
  waterfallHeadingPresetName: string;
  waterfallBodyPresetName: string;
  waterfallHeadingLineHeight: number;
  waterfallBodyLineHeight: number;
  waterfallHeadingLetterSpacing: number;
  waterfallBodyLetterSpacing: number;
  waterfallScaleRatio: number;
  waterfallUnit: WaterfallUnit;
  waterfallRoundPx: boolean;
  textCenter: boolean;
  verticalAlignment: VerticalAlignment;
  textFill: boolean;
  darkTheme: boolean;
  themeMode: ThemeMode;
  previewBackgroundImage: string | null;
};

export type SettingsContextValue = PreviewSettingsSnapshot & {
  setText: Dispatch<SetStateAction<string>>;
  /** Базовый текст для кнопки “Сбросить текст” (зависит от выбранного пресета/сабсета). */
  textResetBaseline: string;
  setTextResetBaseline: Dispatch<SetStateAction<string>>;
  /** Сбросить текст к `textResetBaseline`. */
  resetText: () => void;
  /**
   * Сигнал “сбросили настройки превью”.
   * Нужен для UI, который не должен угадывать состояние по `text`, но должен очищаться при Reset.
   */
  previewResetSignal: number;
  signalPreviewReset: () => void;
  setFontSize: Dispatch<SetStateAction<number>>;
  setGlyphsFontSize: Dispatch<SetStateAction<number>>;
  setStylesFontSize: Dispatch<SetStateAction<number>>;
  setLineHeight: Dispatch<SetStateAction<number>>;
  setLetterSpacing: Dispatch<SetStateAction<number>>;
  setStylesLetterSpacing: Dispatch<SetStateAction<number>>;
  setOpenTypeFeatureOverrides: Dispatch<SetStateAction<Record<string, 0 | 1>>>;
  setTextColor: Dispatch<SetStateAction<string>>;
  setBackgroundColor: Dispatch<SetStateAction<string>>;
  setViewMode: Dispatch<SetStateAction<string>>;
  setTextDirection: Dispatch<SetStateAction<string>>;
  setTextAlignment: Dispatch<SetStateAction<string>>;
  setTextCase: Dispatch<SetStateAction<string>>;
  setTextDecoration: Dispatch<SetStateAction<TextDecoration>>;
  setListStyle: Dispatch<SetStateAction<ListStyle>>;
  setTextColumns: Dispatch<SetStateAction<number>>;
  setTextColumnGap: Dispatch<SetStateAction<number>>;
  setWaterfallRows: Dispatch<SetStateAction<number>>;
  setWaterfallBaseSize: Dispatch<SetStateAction<number>>;
  setWaterfallEditTarget: Dispatch<SetStateAction<WaterfallEditTarget>>;
  setWaterfallHeadingPresetName: Dispatch<SetStateAction<string>>;
  setWaterfallBodyPresetName: Dispatch<SetStateAction<string>>;
  setWaterfallHeadingLineHeight: Dispatch<SetStateAction<number>>;
  setWaterfallBodyLineHeight: Dispatch<SetStateAction<number>>;
  setWaterfallHeadingLetterSpacing: Dispatch<SetStateAction<number>>;
  setWaterfallBodyLetterSpacing: Dispatch<SetStateAction<number>>;
  setWaterfallScaleRatio: Dispatch<SetStateAction<number>>;
  setWaterfallUnit: Dispatch<SetStateAction<WaterfallUnit>>;
  setWaterfallRoundPx: Dispatch<SetStateAction<boolean>>;
  setTextCenter: Dispatch<SetStateAction<boolean>>;
  setVerticalAlignment: Dispatch<SetStateAction<VerticalAlignment>>;
  setTextFill: Dispatch<SetStateAction<boolean>>;
  setDarkTheme: (value: boolean | ((prev: boolean) => boolean)) => void;
  setThemeMode: Dispatch<SetStateAction<ThemeMode>>;
  setPreviewBackgroundImage: Dispatch<SetStateAction<string | null>>;
  resetSettings: () => void;
};
