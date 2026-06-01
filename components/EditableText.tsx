import {
  useRef,
  useEffect,
  useLayoutEffect,
  memo,
  useCallback,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
// Импортируем useSettings
import { useSettings } from '../contexts/SettingsContext';
import { ENTIRE_PRINTABLE_ASCII_SAMPLE } from '../utils/previewSampleStrings';
import { previewTextDbg, previewTextSnippet } from '../utils/previewTextDebugLog';

export type EditableTextProps = {
  style?: CSSProperties | Record<string, unknown>;
  size?: number;
  extraStyles?: CSSProperties;
  isWaterfall?: boolean;
  isStyles?: boolean;
  viewMode?: string;
  syncId?: string;
  /** При анимации VF в Waterfall не вызывать forced reflow каждый кадр */
  skipMetricReflowWhileVfAnimating?: boolean;
};

const EditableText = memo(({
  style,
  size,
  extraStyles,
  isWaterfall = false,
  isStyles = false,
  viewMode,
  syncId = 'global',
  skipMetricReflowWhileVfAnimating = false,
}: EditableTextProps) => {
  const { text, setText } = useSettings();

  const effectiveText =
    typeof text === 'string' && text.trim() ? text : ENTIRE_PRINTABLE_ASCII_SAMPLE;

  const contentRef = useRef<HTMLDivElement | null>(null);
  const localTextRef = useRef(effectiveText);
  const hasModificationsRef = useRef(false);
  const pendingReflowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevFontStyleKeyRef = useRef({
    fontFamily: '',
    fontWeight: '',
    fontStyle: '',
    fontFeatureSettings: '',
    fontVariationSettings: '',
  });

  const resetHorizontalScroll = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    if (el.scrollLeft !== 0) {
      el.scrollLeft = 0;
    }
  }, []);

  // Функция для проверки и управления прокруткой
  const adjustScroll = useCallback(() => {
    if (contentRef.current) {
      // Всегда сбрасываем горизонтальную прокрутку для режимов с nowrap
      if (isWaterfall || isStyles) {
        resetHorizontalScroll(contentRef.current);
      }
    }
  }, [isWaterfall, isStyles, resetHorizontalScroll]);
  
  // После смены семейства / FVS / веса иногда нужен reflow, иначе contenteditable + FontFace API
  // оставляют часть глифов на fallback до следующей перерисовки.
  // В Waterfall при анимации осей N строк × offsetHeight на кадр даёт сильный лаг — пропускаем до паузы.
  useLayoutEffect(() => {
    if (skipMetricReflowWhileVfAnimating) return;
    const el = contentRef.current;
    if (!el || !style) return;

    const nextKey = {
      fontFamily: String((style as any)?.fontFamily ?? ''),
      fontWeight: String((style as any)?.fontWeight ?? ''),
      fontStyle: String((style as any)?.fontStyle ?? ''),
      fontFeatureSettings: String((style as any)?.fontFeatureSettings ?? ''),
      fontVariationSettings: String((style as any)?.fontVariationSettings ?? ''),
    };
    const prevKey = prevFontStyleKeyRef.current;
    prevFontStyleKeyRef.current = nextKey;

    const nonVariationChanged =
      prevKey.fontFamily !== nextKey.fontFamily ||
      prevKey.fontWeight !== nextKey.fontWeight ||
      prevKey.fontStyle !== nextKey.fontStyle ||
      prevKey.fontFeatureSettings !== nextKey.fontFeatureSettings;
    const variationOnlyChanged =
      !nonVariationChanged && prevKey.fontVariationSettings !== nextKey.fontVariationSettings;

    // Менять оси можно очень часто (drag). Чтобы не ломать логику “доглифовки”,
    // делаем reflow с небольшим debounce: один раз после паузы.
    const debounceMs = variationOnlyChanged ? 140 : 0;

    if (pendingReflowTimerRef.current) {
      clearTimeout(pendingReflowTimerRef.current);
      pendingReflowTimerRef.current = null;
    }

    pendingReflowTimerRef.current = setTimeout(() => {
      pendingReflowTimerRef.current = null;
      const node = contentRef.current;
      if (!node) return;
      void node.offsetHeight;
    }, debounceMs);
  }, [
    skipMetricReflowWhileVfAnimating,
    style?.fontFamily,
    style?.fontVariationSettings,
    style?.fontWeight,
    style?.fontStyle,
    style?.fontFeatureSettings,
  ]);

  useEffect(() => {
    return () => {
      if (pendingReflowTimerRef.current) {
        clearTimeout(pendingReflowTimerRef.current);
        pendingReflowTimerRef.current = null;
      }
    };
  }, []);

  // Синхронизируем локальный текст с глобальным при изменении текста извне или смене режима
  useEffect(() => {
    if (contentRef.current && localTextRef.current !== effectiveText) {
      previewTextDbg('EditableText: синхронизация DOM из глобального text', {
        syncId,
        viewMode,
        prevLocalLen: typeof localTextRef.current === 'string' ? localTextRef.current.length : 0,
        nextLen: effectiveText.length,
        nextSnippet: previewTextSnippet(effectiveText, 120),
      });
      contentRef.current.innerText = effectiveText;
      resetHorizontalScroll(contentRef.current);
      localTextRef.current = effectiveText;
      hasModificationsRef.current = false;
    }
  }, [effectiveText, viewMode, syncId, resetHorizontalScroll]);
  
  // Функция для сохранения изменений в глобальное состояние
  const commitTextChanges = useCallback(() => {
    if (setText && hasModificationsRef.current && localTextRef.current !== text) {
      previewTextDbg('EditableText: commit в Settings (blur/unmount)', {
        syncId,
        committedLen: typeof localTextRef.current === 'string' ? localTextRef.current.length : 0,
        prevGlobalLen: typeof text === 'string' ? text.length : 0,
        snippet: previewTextSnippet(localTextRef.current, 120),
      });
      setText(localTextRef.current);
      hasModificationsRef.current = false;
    }
  }, [setText, text, syncId]);
  
  // Эффект для сохранения изменений при потере фокуса или смене режима/размонтировании
  useEffect(() => {
    const handleBlur = () => {
      if (contentRef.current) {
        resetHorizontalScroll(contentRef.current);
      }
      commitTextChanges();
    };

    const elem = contentRef.current;
    if (elem) {
      elem.addEventListener('blur', handleBlur);
    }

    return () => {
      if (elem) {
        elem.removeEventListener('blur', handleBlur);
      }
      commitTextChanges();
    };
  }, [commitTextChanges, viewMode, resetHorizontalScroll]);
  
  // Обработчик для локального изменения текста
  const handleInput = useCallback((e: FormEvent<HTMLDivElement>) => {
    const newText = e.currentTarget.innerText;
    localTextRef.current = newText;
    hasModificationsRef.current = true;
    
    setText(newText);

    if (syncId) {
      const selector = `.editable-sync-${syncId}`;
      document.querySelectorAll(selector).forEach((elem) => {
        if (!(elem instanceof HTMLElement) || elem === e.currentTarget) return;
        if (elem.innerText !== newText) {
          elem.innerText = newText;
          resetHorizontalScroll(elem);
        }
      });
    }
    
    adjustScroll();
  }, [setText, syncId, adjustScroll, resetHorizontalScroll]);
  
  // Обработчик нажатия клавиш для контроля прокрутки при навигации
  const handleKeyUp = useCallback((_e: KeyboardEvent<HTMLDivElement>) => {
    adjustScroll();
  }, [adjustScroll]);
  
  // Устанавливаем начальное значение при монтировании и настраиваем обработчики событий
  useEffect(() => {
    if (contentRef.current) {
      if (!contentRef.current.textContent?.trim()) {
        contentRef.current.innerText = effectiveText;
        localTextRef.current = effectiveText;
      }
      
      resetHorizontalScroll(contentRef.current);
      
      const handleScroll = () => {
        if ((isWaterfall || isStyles) && contentRef.current) {
          requestAnimationFrame(() => {
            if (contentRef.current) {
              resetHorizontalScroll(contentRef.current);
            }
          });
        }
      };
      
      contentRef.current.addEventListener('scroll', handleScroll);
      
      return () => {
        if (contentRef.current) {
          contentRef.current.removeEventListener('scroll', handleScroll);
        }
      };
    }
  }, [effectiveText, isWaterfall, isStyles, resetHorizontalScroll]);
  
  return (
    <div
      ref={contentRef}
      className={`preview-content ${isStyles ? 'min-w-0 max-w-full pl-0' : isWaterfall ? 'pl-6' : 'pl-8'} editable-sync-${syncId} ${isWaterfall ? 'waterfall-editable outline-none' : ''} ${isStyles ? 'styles-editable outline-none' : ''} ${!isWaterfall && !isStyles ? 'outline-none' : ''}`}
      style={{
        ...style,
        ...(extraStyles || {}),
        ...(size ? { fontSize: `${size}px` } : {})
      }}
      contentEditable="true"
      suppressContentEditableWarning={true}
      onInput={handleInput}
      onKeyUp={handleKeyUp}
    />
  );
});

// Устанавливаем displayName для отладки
EditableText.displayName = 'EditableText';

export default EditableText; 
