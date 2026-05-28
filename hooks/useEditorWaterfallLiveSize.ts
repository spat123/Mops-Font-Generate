import { useCallback, useEffect, useState } from 'react';
import type { SessionFontRecord } from '../types/editorFonts';

type UseEditorWaterfallLiveSizeParams = {
  mainTab: string;
  selectedFont: SessionFontRecord | null;
  viewMode: string;
  waterfallBaseSize: number;
  setWaterfallBaseSize: (value: number) => void;
};

/** «Живой» базовый размер Waterfall при перетаскивании в сайдбаре. */
export function useEditorWaterfallLiveSize({
  mainTab,
  selectedFont,
  viewMode,
  waterfallBaseSize,
  setWaterfallBaseSize,
}: UseEditorWaterfallLiveSizeParams) {
  const [liveWaterfallBaseSize, setLiveWaterfallBaseSize] = useState<number | null>(null);

  useEffect(() => {
    setLiveWaterfallBaseSize(null);
  }, [mainTab, selectedFont?.id, viewMode, waterfallBaseSize]);

  const handleWaterfallBaseSizeLiveChange = useCallback((nextValue: number) => {
    setLiveWaterfallBaseSize(nextValue);
  }, []);

  const handleWaterfallBaseSizeCommit = useCallback(
    (nextValue: number) => {
      setLiveWaterfallBaseSize(nextValue);
      setWaterfallBaseSize(nextValue);
      requestAnimationFrame(() => {
        setLiveWaterfallBaseSize(null);
      });
    },
    [setWaterfallBaseSize],
  );

  return {
    liveWaterfallBaseSize,
    handleWaterfallBaseSizeLiveChange,
    handleWaterfallBaseSizeCommit,
  };
}
