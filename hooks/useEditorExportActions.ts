import { useCallback, useMemo } from 'react';
import { toast } from '../utils/appNotify';
import { buildEditorExportCssCode } from '../utils/buildEditorExportCssCode';
import type { SessionFontRecord } from '../types/editorFonts';

type UseEditorExportActionsParams = {
  selectedFont: SessionFontRecord | null;
  variableSettings: Record<string, unknown>;
  fontSize: number;
  lineHeight: number | string;
  letterSpacing: number | string;
  textColor: string;
  textDirection: string;
  textAlignment: string;
  textCase: string;
  getFontFamily: () => string;
  waterfallRows: unknown;
  liveWaterfallBaseSize: number | null;
  waterfallBaseSize: number;
  waterfallUnit: string;
  waterfallScaleRatio: number;
  waterfallEditTarget: string;
  setCssString: (value: string) => void;
  setIsExportModalOpen: (open: boolean) => void;
  setIsGenerateModalOpen: (open: boolean) => void;
};

/**
 * Экспорт CSS и генерация статического VF-файла из редактора.
 */
export function useEditorExportActions({
  selectedFont,
  variableSettings,
  fontSize,
  lineHeight,
  letterSpacing,
  textColor,
  textDirection,
  textAlignment,
  textCase,
  getFontFamily,
  waterfallRows,
  liveWaterfallBaseSize,
  waterfallBaseSize,
  waterfallUnit,
  waterfallScaleRatio,
  waterfallEditTarget,
  setCssString,
  setIsExportModalOpen,
  setIsGenerateModalOpen,
}: UseEditorExportActionsParams) {
  const exportModalFontFamily = useMemo(() => {
    const fam = typeof getFontFamily === 'function' ? getFontFamily() : 'sans-serif';
    return fam === 'inherit' ? 'sans-serif' : fam;
  }, [getFontFamily, selectedFont?.id, selectedFont?.fontFamily, selectedFont?.name]);

  const waterfallExportMeta = useMemo(
    () => ({
      rows: waterfallRows,
      baseSize: liveWaterfallBaseSize ?? waterfallBaseSize,
      unit: waterfallUnit,
      scaleRatio: waterfallScaleRatio,
      editTarget: waterfallEditTarget,
    }),
    [
      waterfallRows,
      liveWaterfallBaseSize,
      waterfallBaseSize,
      waterfallUnit,
      waterfallScaleRatio,
      waterfallEditTarget,
    ],
  );

  const handleExportClick = useCallback(() => {
    if (!selectedFont) {
      toast.error('Сначала выберите шрифт');
      return;
    }
    setCssString(
      buildEditorExportCssCode({
        selectedFont,
        variableSettings,
        fontSize,
        lineHeight,
        letterSpacing,
        textColor,
        textDirection,
        textAlignment,
        textCase,
      }),
    );
    setIsExportModalOpen(true);
  }, [
    selectedFont,
    variableSettings,
    fontSize,
    lineHeight,
    letterSpacing,
    textColor,
    textDirection,
    textAlignment,
    textCase,
    setCssString,
    setIsExportModalOpen,
  ]);

  const handleGenerateClick = useCallback(() => {
    if (!selectedFont) {
      toast.error('Сначала выберите шрифт');
      return;
    }
    if (!selectedFont.isVariableFont) {
      toast.info('Генерация файла доступна для вариативных шрифтов');
      return;
    }
    setIsGenerateModalOpen(true);
  }, [selectedFont, setIsGenerateModalOpen]);

  return {
    exportModalFontFamily,
    waterfallExportMeta,
    handleExportClick,
    handleGenerateClick,
  };
}
