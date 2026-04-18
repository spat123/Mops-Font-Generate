import React, { useState, useCallback, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import debounce from 'lodash.debounce';
import { getGlyphDataForFont } from '../utils/fontParser';
import { useSettings } from '../contexts/SettingsContext';
import { VirtualizedGlyphGrid } from './ui/VirtualizedGlyphGrid';

// Инициализируем глобальный кэш для глифов, чтобы не загружать их повторно
const glyphDataCache = new Map();

/**
 * Компонент для режима отображения глифов шрифта
 * 
 * @param {Object} props - Свойства компонента
 * @param {Object} props.selectedFont - Выбранный шрифт
 * @param {string} props.fontFamily — значение CSS font-family (стек с fallback), как из useFontCss
 * @param {Object} props.glyphDisplayStyle - Стили для отображения глифов
 * @param {boolean} props.isActive - Активен ли режим глифов
 * @param {React.RefObject<HTMLElement|null>} props.scrollParentRef — узел с `overflow-y: auto` (область превью) для виртуальной сетки
 */
function GlyphsMode({
  selectedFont,
  fontFamily,
  glyphDisplayStyle,
  isActive = true,
  scrollParentRef,
}) {
  const { fontSize } = useSettings();

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
    // Ref для отслеживания текущего запроса, чтобы предотвратить race condition
    const currentLoadId = useRef(null);

    // Оборачиваем loadGlyphs в useCallback, чтобы ссылка на функцию была стабильной
    const loadGlyphsCallback = useCallback(async (currentAttemptLoadId, fontToLoad, attemptFontId) => {
      // Проверяем, не отменен ли этот запрос (т.е. начался ли новый)
      if (currentAttemptLoadId !== currentLoadId.current) {
          return; 
      }
      
      try {
        // Сбрасываем состояние только если этот запрос все еще актуален
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

        const data = await getGlyphDataForFont(fontToLoad); // Используем переданный fontToLoad

        // СНОВА проверяем, актуален ли запрос ПЕРЕД установкой состояния
        if (currentAttemptLoadId !== currentLoadId.current) {
            return; 
        }

        if (!data || !Array.isArray(data.allGlyphs)) {
          throw new Error("Получены некорректные данные глифов (отсутствует allGlyphs).");
        }

        glyphDataCache.set(attemptFontId, data); // Используем attemptFontId для кэша
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

    // Создаем мемоизированную debounced-версию
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
        // Устанавливаем флаг загрузки ПЕРЕД вызовом debounced функции
        isLoadingGlyphs.current = true;
        // Вызываем debounced-функцию, передавая необходимые параметры
        debouncedLoadGlyphs(loadId, selectedFont, fontId);
      } else {
        // Если данные уже загружены, но флаг загрузки все еще стоит (маловероятно, но возможно)
        if (isLoadingGlyphs.current) {
             isLoadingGlyphs.current = false;
        }
      }

      // Функция очистки для useEffect
      return () => {
          // Отменяем любые отложенные вызовы debouncedLoadGlyphs
          debouncedLoadGlyphs.cancel();
          // Сбрасываем currentLoadId, чтобы будущие колбэки от этого useEffect не выполнились
          // currentLoadId.current = null; // Не сбрасываем здесь, чтобы обработать последний актуальный вызов
      };

    }, [selectedFont, isActive, debouncedLoadGlyphs]);

    // Стили для отображения увеличенного глифа в модальном окне
    const largeGlyphStyle = useMemo(() => {
      // Используем fontSize из useSettings вместо selectedFontSize
      const baseSize = fontSize || 40; // Используем fontSize, fallback 40
      const modalFontSize = Math.max(80, Math.min(200, baseSize * 2.5));
      
      return {
        fontFamily: fontFamily || 'inherit',
        fontSize: `${modalFontSize}px`,
        lineHeight: 1,
        ...(glyphDisplayStyle || {}),
      };
    }, [fontFamily, glyphDisplayStyle, fontSize]);

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

    // --- Логика для отображения ВСЕХ глифов ---
    // Обновляем useMemo для использования glyphsData.allGlyphs
    const displayableGlyphs = useMemo(() => {
      // Используем allGlyphs БЕЗ дополнительной фильтрации .notdef
      return glyphsData?.allGlyphs || [];
    }, [glyphsData]);

    // Хелперы для получения имени и Unicode
    // Обновляем для использования glyphsData.names и glyphsData.unicodes
    const getGlyphName = useCallback((glyph) => {
      // Сначала пробуем из карты names, потом из самого объекта glyph
      return glyphsData?.names?.[glyph?.id] || glyph?.name || `Glyph ${glyph?.id}`;
    }, [glyphsData]);

    const getGlyphUnicode = useCallback((glyph) => {
      // Сначала пробуем из карты unicodes, потом из самого объекта glyph
      const unicodeValue = glyphsData?.unicodes?.[glyph?.id];
      if (unicodeValue) return unicodeValue;
      // Запасной вариант - форматируем из glyph.unicode
      if (glyph?.unicode) {
         return `U+${glyph.unicode.toString(16).toUpperCase().padStart(4, '0')}`;
      }
      return ''; // Возвращаем пустую строку, если Unicode нет
    }, [glyphsData]);

    const [selectedGlyph, setSelectedGlyph] = useState(null);

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
            className="flex h-full cursor-pointer flex-col overflow-hidden rounded-md border border-gray-200 bg-white transition-all hover:border-gray-400 hover:shadow-md"
            onClick={() => setSelectedGlyph(glyph)}
            title={`Нажмите, чтобы увидеть детали глифа ${glyphName}`}
          >
            <div
              className="flex flex-grow items-center justify-center p-4 text-center"
              style={{
                fontSize: `${fontSize}px`,
                fontFamily: fontFamily || 'inherit',
                ...glyphDisplayStyle,
              }}
            >
              {isPrintable ? char : <span className="text-sm text-gray-400">(no char)</span>}
            </div>
            <div className="bg-gray-50 p-2 text-[10px]">
              <div className="w-full truncate text-center font-medium text-gray-700" title={glyphName}>
                {glyphName}
              </div>
              <div className="text-center text-gray-500">{glyphUnicodeStr || '-'}</div>
              <div className="mt-1 flex justify-center gap-1">
                {isPrintable && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(char, 'Символ');
                    }}
                    className="rounded bg-gray-100 px-1 py-0.5 text-[8px] text-gray-800 hover:bg-gray-200"
                    title="Копировать символ"
                  >
                    Char
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(glyphName, 'Имя');
                  }}
                  className="rounded bg-gray-100 px-1 py-0.5 text-[8px] text-gray-700 hover:bg-gray-200"
                  title="Копировать имя"
                >
                  Name
                </button>
                {glyphUnicodeStr && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(glyphUnicodeStr, 'Unicode');
                    }}
                    className="rounded bg-gray-100 px-1 py-0.5 text-[8px] text-gray-700 hover:bg-gray-200"
                    title="Копировать Unicode"
                  >
                    Unicode
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      },
      [
        displayableGlyphs,
        fontSize,
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
      
    // Сообщение, если шрифт - Google Font (проверяется после isLoading)
    if (selectedFont?.source === 'google') {
        return <div className="p-8 text-center text-gray-500">Просмотр глифов недоступен для шрифтов Google.</div>;
    }

    // Условие отображения ошибки или отсутствия данных (после попытки загрузки и не Google Font)
    if (!glyphsLoaded || !glyphsData || displayableGlyphs.length === 0) {
      // Не показываем ошибку, если isLoadingGlyphs все еще true
      if (isLoadingGlyphs.current) return null; 
      return (
          <div className="p-8 text-center text-gray-500">
              Нет данных о глифах для шрифта "{selectedFont?.name || 'Неизвестный'}" 
              или не удалось их загрузить. Проверьте консоль на наличие ошибок.
          </div>
      );
    }

    const glyphRowHeightPx = Math.round(Math.max(168, (fontSize || 40) * 1.35 + 96));

    return (
      <div className="w-full px-8 pb-6 pt-4">
        <p className="mb-2 text-sm text-gray-600">Найдено {displayableGlyphs.length} глифов.</p>

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
            estimatedRowHeightPx={glyphRowHeightPx}
            renderItem={renderGlyphGridItem}
            overscanRows={2}
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
              
              {(() => { // Используем IIFE для получения значений один раз
                  const name = getGlyphName(selectedGlyph);
                  const unicodeStr = getGlyphUnicode(selectedGlyph);
                  const advanceWidth = glyphsData?.advanceWidths?.[selectedGlyph.id];
                  
                  // --- Обновленная логика получения символа для модального окна ---
                  let char = null;
                  let isPrintable = false;

                  // 1. Пробуем основной unicode
                  if (selectedGlyph.unicode) {
                    try {
                      const potentialChar = String.fromCodePoint(selectedGlyph.unicode);
                      if (potentialChar && potentialChar.trim() !== '' && !/[\p{C}]/u.test(potentialChar)) {
                        char = potentialChar;
                        isPrintable = true;
                      }
                    } catch (e) {}
                  }

                  // 2. Если не получилось, пробуем массив unicodes
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
                   // --- Конец обновленной логики ---

                  return (
                      <>
                          <h3 className="text-xl font-semibold mb-4 text-gray-800 truncate" title={name}>
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
                                  <button onClick={() => copyToClipboard(char, 'Символ')} className="px-3 py-1.5 bg-accent text-white rounded hover:bg-accent-hover text-sm shadow-sm">Копировать символ</button>
                              )}
                              <button onClick={() => copyToClipboard(name, 'Имя')} className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm shadow-sm">Копировать имя</button>
                              {unicodeStr && (
                                  <button onClick={() => copyToClipboard(unicodeStr, 'Unicode')} className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm shadow-sm">Копировать Unicode</button>
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