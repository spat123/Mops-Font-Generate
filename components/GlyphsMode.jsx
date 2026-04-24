import React, { useState, useCallback, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import { toast } from '../utils/appNotify';
import { debounce } from '../utils/debounce';
import { getGlyphDataForFont } from '../utils/fontParser';
import { useSettings } from '../contexts/SettingsContext';
import { VirtualizedGlyphGrid } from './ui/VirtualizedGlyphGrid';

// Глобальный кэш глифов, чтобы не загружать их повторно.
const glyphDataCache = new Map();

/** Квадратная сетка: размер ячейки зависит от размера шрифта и ширины контейнера. */
function computeGlyphSquareGrid(innerWidthPx, fontSizePx) {
  const W = Math.max(64, innerWidthPx);
  const fs = fontSizePx || 40;
  const targetSide = Math.round(Math.max(48, Math.min(320, fs * 2.2 + 14)));
  let cols = Math.round(W / targetSide);
  cols = Math.max(2, Math.min(40, cols));
  const rowH = Math.max(28, Math.round(W / cols));
  return { columnCount: cols, rowHeightPx: rowH };
}

/**
 * Компонент режима просмотра глифов.
 * 
 * @param {Object} props - Свойства компонента.
 * @param {Object} props.selectedFont - Выбранный шрифт.
 * @param {string} props.fontFamily - CSS `font-family` (стек с fallback) из useFontCss.
 * @param {Object} props.glyphDisplayStyle - Стили отображения глифов.
 * @param {boolean} props.isActive - Активен ли режим глифов.
 * @param {React.RefObject<HTMLElement|null>} props.scrollParentRef - Скролл-контейнер области превью.
 */
function GlyphsMode({
  selectedFont,
  fontFamily,
  glyphDisplayStyle,
  isActive = true,
  scrollParentRef,
  /** Сообщить родителю количество отображаемых глифов (для нижней панели). */
  onDisplayableGlyphCountChange,
}) {
  const { glyphsFontSize } = useSettings();

  const [scrollParentEl, setScrollParentEl] = useState(null);
  useLayoutEffect(() => {
    const el = scrollParentRef?.current;
    const next = el instanceof HTMLElement ? el : null;
    setScrollParentEl((prev) => (Object.is(prev, next) ? prev : next));
  }, [scrollParentRef]);

  try {
    // Состояние и ref для загрузки глифов
    const [glyphsLoaded, setGlyphsLoaded] = useState(false);
    const [glyphsData, setGlyphsData] = useState(null);
    const [glyphErrors, setGlyphErrors] = useState([]);
    const isLoadingGlyphs = useRef(false);
    // Ref to track active request and prevent race conditions.
    const currentLoadId = useRef(null);

    // Оборачиваем loadGlyphs в useCallback для стабильной ссылки
    const loadGlyphsCallback = useCallback(async (currentAttemptLoadId, fontToLoad, attemptFontId) => {
      // Проверяем, не отменён ли этот запрос (например, стартовал новый)
      if (currentAttemptLoadId !== currentLoadId.current) {
          return; 
      }
      
      try {
        // Сбрасываем состояние только если запрос всё ещё актуален
        if (currentAttemptLoadId === currentLoadId.current) {
           setGlyphsLoaded(false);
           setGlyphsData(null);
           setGlyphErrors([]);
        }

        // Проверяем кэш
        if (glyphDataCache.has(attemptFontId)) {
          const cachedData = glyphDataCache.get(attemptFontId);
          if (currentAttemptLoadId === currentLoadId.current) {
              setGlyphsData(cachedData);
              setGlyphsLoaded(true);
              setGlyphErrors(cachedData.errors || []);
              isLoadingGlyphs.current = false; 
              if (!cachedData?.allGlyphs) {
                console.warn("Cached glyph data is missing 'allGlyphs'.");
              }
          }
          return;
        }

        const data = await getGlyphDataForFont(fontToLoad); // Use provided fontToLoad.

        // Снова проверяем актуальность запроса перед setState
        if (currentAttemptLoadId !== currentLoadId.current) {
            return; 
        }

        if (!data || !Array.isArray(data.allGlyphs)) {
          throw new Error('Получены некорректные данные глифов (отсутствует allGlyphs).');
        }

        glyphDataCache.set(attemptFontId, data); // Use attemptFontId as cache key.
        setGlyphsData(data);
        setGlyphsLoaded(true);
        setGlyphErrors(data.errors || []);
        isLoadingGlyphs.current = false; 

      } catch (error) {
        console.error('[GlyphsMode Debounced] Ошибка при загрузке глифов:', error);
        toast.error(`Не удалось загрузить данные глифов: ${error.message}`);
        if (currentAttemptLoadId === currentLoadId.current) {
            setGlyphsData(null);
            setGlyphsLoaded(false);
            setGlyphErrors([]);
            isLoadingGlyphs.current = false; 
        }
      } 
    }, []); // Пустой массив зависимостей для useCallback

    // Мемоизируем debounced-версию
    const debouncedLoadGlyphs = useMemo(() => {
        return debounce(loadGlyphsCallback, 200);
    }, [loadGlyphsCallback]);

    // Единый useEffect для загрузки и сброса состояния глифов
    useEffect(() => {
      if (!isActive) {
        return;
      }

      const fontId = selectedFont?.id;
      const loadId = Math.random().toString(36).substring(2, 10);
      currentLoadId.current = loadId; 

      const resetState = () => {
        setGlyphsLoaded(false);
        setGlyphsData(null);
        setGlyphErrors([]);
        isLoadingGlyphs.current = false; // Сбрасываем флаг загрузки
      };

      // --- Проверки перед загрузкой ---
      if (!selectedFont) {
        resetState();
        return;
      }
      
      if (!selectedFont.file || !(selectedFont.file instanceof Blob)) {
        resetState();
        console.warn(`[GlyphsMode] Attempted to load glyphs for ${selectedFont.name} without a valid file object.`);
        return;
      }

      // --- Запуск загрузки через debounce ---
      const isDataLoadedInState = glyphsLoaded && glyphsData && glyphsData.allGlyphs;

      if (!isDataLoadedInState) {
        // Поднимаем флаг загрузки перед вызовом debounced-функции
        isLoadingGlyphs.current = true;
        // Вызываем debounced-функцию с нужными параметрами
        debouncedLoadGlyphs(loadId, selectedFont, fontId);
      } else {
        // Если данные уже есть, но флаг загрузки всё ещё true
        if (isLoadingGlyphs.current) {
             isLoadingGlyphs.current = false;
        }
      }

      // Функция очистки для useEffect
      return () => {
          // Cancel pending debounced calls.
          debouncedLoadGlyphs.cancel();
          // Do not reset currentLoadId here to let latest valid call complete.
          // currentLoadId.current = null; // Не сбрасываем здесь, чтобы завершить последний актуальный вызов
      };

    }, [selectedFont, isActive, debouncedLoadGlyphs]);

    // Styles for enlarged glyph in modal.
    const largeGlyphStyle = useMemo(() => {
      // Используем fontSize из useSettings вместо selectedFontSize
      const baseSize = glyphsFontSize || 40; // Use glyphsFontSize, fallback to 40.
      const modalFontSize = Math.max(80, Math.min(200, baseSize * 2.5));
      
      return {
        fontFamily: fontFamily || 'inherit',
        fontSize: `${modalFontSize}px`,
        lineHeight: 1,
        ...(glyphDisplayStyle || {}),
      };
    }, [fontFamily, glyphDisplayStyle, glyphsFontSize]);

    const copyToClipboard = useCallback((text, type = 'Символ') => {
      if (!text) {
          return;
      }
      navigator.clipboard.writeText(text)
        .then(() => {
          toast.success(`${type} "${text}" скопирован`);
        })
        .catch(err => {
          console.error('Не удалось скопировать: ', err);
          toast.error(`Не удалось скопировать ${type.toLowerCase()}`);
        });
    }, []);

    // --- Display logic for all glyphs ---
    // Use memoized allGlyphs from glyphsData.
    const displayableGlyphs = useMemo(() => {
      // Keep allGlyphs without extra .notdef filtering.
      return glyphsData?.allGlyphs || [];
    }, [glyphsData]);

    useEffect(() => {
      if (!onDisplayableGlyphCountChange || !isActive) return;
      if (selectedFont?.source === 'google') {
        onDisplayableGlyphCountChange(null);
        return;
      }
      if (!glyphsLoaded || !glyphsData) {
        onDisplayableGlyphCountChange(null);
        return;
      }
      onDisplayableGlyphCountChange(displayableGlyphs.length);
    }, [
      isActive,
      selectedFont?.source,
      glyphsLoaded,
      glyphsData,
      displayableGlyphs.length,
      onDisplayableGlyphCountChange,
    ]);

    // Хелперы для имени и Unicode
    // Helpers based on glyphsData.names and glyphsData.unicodes.
    const getGlyphName = useCallback((glyph) => {
      // Сначала пробуем карту names, затем поле glyph
      return glyphsData?.names?.[glyph?.id] || glyph?.name || `Glyph ${glyph?.id}`;
    }, [glyphsData]);

    const getGlyphUnicode = useCallback((glyph) => {
      // Сначала пробуем карту unicodes, затем поле glyph
      const unicodeValue = glyphsData?.unicodes?.[glyph?.id];
      if (unicodeValue) return unicodeValue;
      // Запасной вариант: форматируем из glyph.unicode
      if (glyph?.unicode) {
         return `U+${glyph.unicode.toString(16).toUpperCase().padStart(4, '0')}`;
      }
      return ''; // Возвращаем пустую строку, если Unicode нет
    }, [glyphsData]);

    const [selectedGlyph, setSelectedGlyph] = useState(null);
    const [glyphGridInnerWidth, setGlyphGridInnerWidth] = useState(null);

    const onGlyphGridInnerWidth = useCallback((w) => {
      if (typeof w === 'number' && w > 32) setGlyphGridInnerWidth(w);
    }, []);

    const glyphSquareGrid = useMemo(() => {
      const fallbackW =
        glyphGridInnerWidth != null
          ? glyphGridInnerWidth
          : typeof window !== 'undefined'
            ? Math.max(200, Math.min(1200, window.innerWidth - 140))
            : 560;
      return computeGlyphSquareGrid(fallbackW, glyphsFontSize);
    }, [glyphGridInnerWidth, glyphsFontSize]);

    const glyphCellFontPx = useMemo(() => {
      const side = glyphSquareGrid.rowHeightPx;
      return Math.min(glyphsFontSize || 40, Math.max(8, Math.round(side * 0.48)));
    }, [glyphsFontSize, glyphSquareGrid.rowHeightPx]);

    const renderGlyphGridItem = useCallback(
      (index) => {
        const glyph = displayableGlyphs[index];
        if (!glyph) return null;

        let char = null;
        let isPrintable = false;

        if (glyph.unicode) {
          try {
            const potentialChar = String.fromCodePoint(glyph.unicode);
            if (potentialChar && potentialChar.trim() !== '' && !/[\p{C}]/u.test(potentialChar)) {
              char = potentialChar;
              isPrintable = true;
            }
          } catch {
            /* ignore */
          }
        }

        if (!isPrintable && glyph.unicodes && glyph.unicodes.length > 0) {
          for (const codePoint of glyph.unicodes) {
            try {
              const potentialChar = String.fromCodePoint(codePoint);
              if (potentialChar && potentialChar.trim() !== '' && !/[\p{C}]/u.test(potentialChar)) {
                char = potentialChar;
                isPrintable = true;
                break;
              }
            } catch {
              /* ignore */
            }
          }
        }

        const glyphName = getGlyphName(glyph);
        const glyphUnicodeStr = getGlyphUnicode(glyph);

        return (
          <div
            className="group relative box-border flex h-full min-h-0 cursor-pointer flex-col items-stretch border-r border-b border-gray-200 bg-white transition-shadow duration-100 hover:z-[2] hover:ring-1 hover:ring-inset hover:ring-gray-900"
            onClick={() => setSelectedGlyph(glyph)}
          >
            <div
              className="flex min-h-0 flex-1 flex-col items-center justify-center p-1 text-center transition-opacity duration-100 group-hover:pointer-events-none group-hover:opacity-0"
              style={{
                fontSize: `${glyphCellFontPx}px`,
                fontFamily: fontFamily || 'inherit',
                ...glyphDisplayStyle,
              }}
            >
              {isPrintable ? (
                char
              ) : (
                <span className="text-[10px] text-gray-400" aria-hidden>
                  —
                </span>
              )}
            </div>

            <div className="pointer-events-none absolute inset-0 z-[1] flex flex-col items-center justify-center gap-1 px-1 py-1 opacity-0 transition-opacity duration-100 group-hover:pointer-events-auto group-hover:opacity-100">
              <span className="w-full max-w-full truncate text-center font-mono text-sm font-medium leading-tight text-gray-900">
                {glyphName}
              </span>
              <span className="max-w-full truncate text-center font-mono text-xs leading-tight text-gray-600">
                {glyphUnicodeStr || '—'}
              </span>
              <div className="mt-0.5 flex flex-wrap items-center justify-center gap-1">
                {isPrintable && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(char, 'Символ');
                    }}
                    className="rounded bg-gray-100 px-1.5 py-1 text-[10px] font-medium leading-none text-gray-800 hover:bg-gray-200"
                    aria-label="Копировать символ"
                  >
                    Ch
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(glyphName, 'Имя');
                  }}
                  className="rounded bg-gray-100 px-1.5 py-1 text-[10px] font-medium leading-none text-gray-700 hover:bg-gray-200"
                  aria-label="Копировать имя (PostScript)"
                >
                  Nm
                </button>
                {glyphUnicodeStr ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(glyphUnicodeStr, 'Unicode');
                    }}
                    className="rounded bg-gray-100 px-1.5 py-1 text-[10px] font-medium leading-none text-gray-700 hover:bg-gray-200"
                    aria-label="Копировать Unicode"
                  >
                    U+
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        );
      },
      [
        displayableGlyphs,
        glyphCellFontPx,
        fontFamily,
        glyphDisplayStyle,
        getGlyphName,
        getGlyphUnicode,
        copyToClipboard,
      ],
    );

    // Условие отображения загрузчика
    if (isLoadingGlyphs.current) {
       return <div className="p-8 text-center text-gray-600">Загрузка данных глифов...</div>;
    }
      
    // Сообщение, если шрифт — Google Font (после проверки isLoading)
    if (selectedFont?.source === 'google') {
        return (
          <div className="flex min-h-full flex-col items-center justify-center px-6 py-10 text-center">
            <div className="w-full max-w-[8rem] aspect-square overflow-hidden rounded-lg">
              <img
                src="/assets/hell-no-oh-hell-no.gif"
                alt="Просмотр глифов недоступен"
                className="h-full w-full select-none object-cover"
              />
            </div>
            <p className="mt-4 text-sm font-normal text-gray-800">
              Просмотр глифов недоступен
              <br />
              для шрифтов Google
            </p>
          </div>
        );
    }

    // Условие отображения ошибки или отсутствия данных
    if (!glyphsLoaded || !glyphsData || displayableGlyphs.length === 0) {
      // Не показываем ошибку, пока isLoadingGlyphs всё ещё true
      if (isLoadingGlyphs.current) return null; 
      return (
          <div className="p-8 text-center text-gray-500">
              Нет данных о глифах для шрифта "{selectedFont?.name || 'Неизвестный'}" 
              или не удалось их загрузить. Проверьте консоль на наличие ошибок.
          </div>
      );
    }

    return (
      <div className="relative min-h-full w-full p-6 pb-8 pr-8">
        {glyphErrors.length > 0 && (
          <div className="mb-4 rounded border border-yellow-300 bg-yellow-100 p-3 text-xs text-yellow-800">
            При обработке шрифта возникло {glyphErrors.length} ошибок.
            Некоторые глифы могут отображаться некорректно.
          </div>
        )}

        {scrollParentEl ? (
          <VirtualizedGlyphGrid
            scrollParentEl={scrollParentEl}
            totalCount={displayableGlyphs.length}
            columnCount={glyphSquareGrid.columnCount}
            estimatedRowHeightPx={glyphSquareGrid.rowHeightPx}
            renderItem={renderGlyphGridItem}
            overscanRows={2}
            rowGapPx={0}
            seamlessGrid
            onInnerWidth={onGlyphGridInnerWidth}
          />
        ) : null}

        {/* Детали глифа */}
        {selectedGlyph && (
          <div 
              className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" 
              onClick={() => setSelectedGlyph(null)}
          >
            <div 
              className="bg-white p-6 sm:p-8 rounded-lg shadow-xl max-w-md w-full relative" 
              onClick={e => e.stopPropagation()}
            >
              <button 
                  onClick={() => setSelectedGlyph(null)} 
                  className="absolute top-2 right-3 text-gray-400 hover:text-gray-700 text-3xl font-light leading-none"
                  aria-label="Закрыть"
              >
                  &times;
              </button>
              
              {(() => { // IIFE to compute values once.
                  const name = getGlyphName(selectedGlyph);
                  const unicodeStr = getGlyphUnicode(selectedGlyph);
                  const advanceWidth = glyphsData?.advanceWidths?.[selectedGlyph.id];
                  
                  // --- Character resolution logic for modal view ---
                  let char = null;
                  let isPrintable = false;

                  // 1. Try primary unicode.
                  if (selectedGlyph.unicode) {
                    try {
                      const potentialChar = String.fromCodePoint(selectedGlyph.unicode);
                      if (potentialChar && potentialChar.trim() !== '' && !/[\p{C}]/u.test(potentialChar)) {
                        char = potentialChar;
                        isPrintable = true;
                      }
                    } catch (e) {}
                  }

                  // 2. Fallback to unicodes array.
                  if (!isPrintable && selectedGlyph.unicodes && selectedGlyph.unicodes.length > 0) {
                    for (const codePoint of selectedGlyph.unicodes) {
                      try {
                        const potentialChar = String.fromCodePoint(codePoint);
                         if (potentialChar && potentialChar.trim() !== '' && !/[\p{C}]/u.test(potentialChar)) {
                          char = potentialChar;
                          isPrintable = true;
                          break; 
                        }
                      } catch (e) {}
                    }
                  }
                   // --- End character resolution logic ---

                  return (
                      <>
                          <h3 className="text-xl font-semibold mb-4 text-gray-800 truncate">
                              Детали глифа: {name}
                          </h3>
                          <div className="text-center mb-6 p-4 bg-gray-50 rounded" style={largeGlyphStyle}>
                              {isPrintable ? char : <span className="text-gray-400 text-xl">(no char)</span>}
                          </div>
                          <div className="space-y-2 text-sm text-gray-700">
                              <p><strong>Имя:</strong> {name}</p>
                              <p><strong>Unicode:</strong> {unicodeStr || 'N/A'}</p>
                              <p><strong>ID (индекс):</strong> {selectedGlyph.id}</p>
                              {advanceWidth !== undefined && (
                                  <p><strong>Ширина (advanceWidth):</strong> {advanceWidth}</p>
                              )}
                              {selectedGlyph.unicodes && selectedGlyph.unicodes.length > 1 && (
                                  <p><strong>Другие Unicode:</strong> {selectedGlyph.unicodes.filter(u => u !== selectedGlyph.unicode).map(u => `U+${u.toString(16).toUpperCase().padStart(4,'0')}`).join(', ')}</p>
                              )}
                          </div>
                          <div className="mt-6 flex flex-wrap justify-end gap-2">
                              {isPrintable && (
                                  <button onClick={() => copyToClipboard(char, 'Символ')} className="px-3 py-1.5 bg-accent text-white rounded hover:bg-accent-hover text-sm">Копировать символ</button>
                              )}
                              <button onClick={() => copyToClipboard(name, 'Имя')} className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm">Копировать имя</button>
                              {unicodeStr && (
                                  <button onClick={() => copyToClipboard(unicodeStr, 'Unicode')} className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm">Копировать Unicode</button>
                              )}
                          </div>
                      </>
                  );
              })()}
            </div>
        </div>
        )}
      </div>
    );
  } catch (error) {
    console.error("[GlyphsMode] Render error caught:", error);
    // Возвращаем простой fallback UI при ошибке рендера
    return (
        <div className="p-8 text-center text-red-600 bg-red-50 border border-red-200 rounded">
            <p className="font-bold mb-2">Ошибка рендеринга в компоненте GlyphsMode.</p>
            <p className="text-sm">Пожалуйста, проверьте консоль для деталей.</p>
        </div>
    );
  }
}

export default GlyphsMode; 
