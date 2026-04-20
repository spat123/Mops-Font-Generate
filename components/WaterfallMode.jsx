import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useFontContext } from '../contexts/FontContext';
import EditableText from './EditableText';
import { VirtualizedVariableList } from './ui/VirtualizedVariableList';

// Fallback, если родитель не передал массив (должен совпадать с FontPreview.waterfallSizes)
const DEFAULT_WATERFALL_SIZES = [180, 120, 96, 72, 60, 48, 36, 30, 24, 18, 14, 12, 10, 8];

function estimateWaterfallRowHeight(sizePx, lineHeight) {
  const pad = 32;
  const lh = sizePx > 48 ? 1.0 : lineHeight;
  return pad + Math.ceil(sizePx * lh) + 1;
}

/**
 * @param {object} props
 * @param {number[]=} props.waterfallSizes
 * @param {React.RefObject<HTMLElement|null>=} props.scrollParentRef — общий скролл области превью
 */
const WaterfallMode = ({
  waterfallSizes: sizesProp,
  scrollParentRef,
  /** Не дергать offsetHeight в каждой строке на каждом кадре анимации VF */
  isVariableFontAnimating = false,
} = {}) => {
  const waterfallSizes =
    Array.isArray(sizesProp) && sizesProp.length > 0 ? sizesProp : DEFAULT_WATERFALL_SIZES;

  const { backgroundColor, previewBackgroundImage, textAlignment, lineHeight, textCase, textColor } =
    useSettings();

  const { selectedFont, getFontFamily, fontCssProperties } = useFontContext();

  const [scrollParentEl, setScrollParentEl] = useState(null);

  useLayoutEffect(() => {
    const el = scrollParentRef?.current;
    setScrollParentEl(el instanceof HTMLElement ? el : null);
  }, [scrollParentRef]);

  const baseTextStyle = useMemo(() => {
    const fromHook =
      fontCssProperties && typeof fontCssProperties === 'object' && fontCssProperties.fontFamily
        ? { ...fontCssProperties }
        : { fontFamily: getFontFamily() };
    return {
      ...fromHook,
      textAlign: textAlignment,
      textTransform: textCase === 'none' ? 'none' : textCase,
      color: textColor,
    };
  }, [fontCssProperties, getFontFamily, textAlignment, textCase, textColor]);

  const itemHeights = useMemo(
    () => waterfallSizes.map((size) => estimateWaterfallRowHeight(size, lineHeight)),
    [waterfallSizes, lineHeight],
  );

  const renderItem = useCallback(
    (index) => {
      const size = waterfallSizes[index];
      const itemStyle = {
        ...baseTextStyle,
        fontSize: `${size}px`,
        lineHeight: size > 48 ? 1.0 : lineHeight,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        width: '100%',
        textAlign: textAlignment,
      };

      return (
        <div
          className={`${index > 0 ? 'border-t border-gray-200' : ''} pb-4 pt-4`}
          style={{ contain: 'layout style' }}
        >
          <div className="flex items-center">
            <div className="shrink-0 pl-5 text-right text-xs font-medium text-gray-500">{size}px</div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <EditableText
                style={itemStyle}
                isStyles={false}
                syncId={`waterfall-${size}`}
                viewMode="waterfall"
                isWaterfall={true}
                skipMetricReflowWhileVfAnimating={isVariableFontAnimating}
              />
            </div>
          </div>
        </div>
      );
    },
    [baseTextStyle, lineHeight, textAlignment, waterfallSizes, isVariableFontAnimating],
  );

  if (!selectedFont) {
    return (
      <div className="flex h-full min-h-[200px] w-full items-center justify-center text-gray-500">
        Выберите или загрузите шрифт для просмотра в режиме Waterfall.
      </div>
    );
  }

  if (!scrollParentEl) {
    return <div className="h-0 w-full shrink-0" aria-hidden />;
  }

  return (
    <div
      className="w-full min-w-0"
      style={{
        backgroundColor: previewBackgroundImage ? 'transparent' : (backgroundColor ?? undefined),
      }}
    >
      <VirtualizedVariableList
        scrollParentEl={scrollParentEl}
        itemHeights={itemHeights}
        renderItem={renderItem}
        overscanPx={96}
      />
    </div>
  );
};

export default WaterfallMode;
