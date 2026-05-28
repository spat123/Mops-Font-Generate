import { useEffect, useRef, type MutableRefObject } from 'react';
import { getDefaultPreviewSettingsSnapshot } from '../contexts/SettingsContext';
import { areIdOrdersEqual, orderItemsByIdList } from '../utils/arrayOrder';
import { SESSION_FONT_ORDER_LS_KEY } from '../utils/editorShellStorage';
import { isFontsourcePrewarmEnabled } from '../utils/fontsourcePrewarmFlag';
import { usePerFontPreviewPersistence } from './usePerFontPreviewPersistence';
import { useFontsourcePreviewPrewarm } from './useFontsourcePreviewPrewarm';
import type { SessionFontRecord } from '../types/editorFonts';
import type { Dispatch, SetStateAction } from 'react';

type UseEditorPreviewOrchestratorParams = {
  getPreviewSettingsValues: () => Record<string, unknown>;
  getPreviewSettingsSetters: () => Record<string, unknown>;
  previewSettingsDeps: unknown[];
  hasRestoredEditorMainTab: boolean;
  isInitialLoadComplete: boolean;
  mainTab: string;
  fonts: SessionFontRecord[];
  setFonts: Dispatch<SetStateAction<SessionFontRecord[]>>;
  initialSessionFontOrderIdsRef: MutableRefObject<string[]>;
};

/**
 * Refs настроек превью, per-font persistence, порядок вкладок сессии, Fontsource prewarm.
 */
export function useEditorPreviewOrchestrator({
  getPreviewSettingsValues,
  getPreviewSettingsSetters,
  previewSettingsDeps,
  hasRestoredEditorMainTab,
  isInitialLoadComplete,
  mainTab,
  fonts,
  setFonts,
  initialSessionFontOrderIdsRef,
}: UseEditorPreviewOrchestratorParams): void {
  const previewSettingsValuesRef = useRef<Record<string, unknown>>({});
  previewSettingsValuesRef.current = getPreviewSettingsValues();

  const previewSettersRef = useRef<Record<string, unknown>>({});
  previewSettersRef.current = getPreviewSettingsSetters();

  const hasAppliedInitialSessionFontOrderRef = useRef(false);

  useFontsourcePreviewPrewarm({
    hasRestoredEditorMainTab,
    enabled: isFontsourcePrewarmEnabled(),
  });

  usePerFontPreviewPersistence({
    hasRestoredEditorMainTab,
    isInitialLoadComplete,
    mainTab,
    fonts,
    setFonts,
    previewSettingsValuesRef,
    previewSettersRef,
    getDefaultPreviewSettingsSnapshot,
    previewSettingsDeps,
  });

  useEffect(() => {
    if (!isInitialLoadComplete || hasAppliedInitialSessionFontOrderRef.current) return;
    if (fonts.length === 0) {
      hasAppliedInitialSessionFontOrderRef.current = true;
      return;
    }
    const savedOrder = initialSessionFontOrderIdsRef.current;
    if (savedOrder.length > 0) {
      const orderedFonts = orderItemsByIdList(fonts, savedOrder);
      if (!areIdOrdersEqual(fonts, orderedFonts.map((font) => font.id))) {
        setFonts(orderedFonts);
      }
    }
    hasAppliedInitialSessionFontOrderRef.current = true;
  }, [fonts, isInitialLoadComplete, setFonts, initialSessionFontOrderIdsRef]);

  useEffect(() => {
    if (!isInitialLoadComplete || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(SESSION_FONT_ORDER_LS_KEY, JSON.stringify(fonts.map((font) => font.id)));
    } catch {
      /* ignore */
    }
  }, [fonts, isInitialLoadComplete]);
}
