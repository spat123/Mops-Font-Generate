import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useFontContext } from '../contexts/FontContext';
import { toast } from 'react-toastify';
import { hasSignificantChanges } from '../utils/cssGenerator';
import { variableFontShowsItalicControl } from '../utils/fontUtilsCommon';
import DraggableValueRangeSlider from './ui/DraggableValueRangeSlider';
import { SegmentedControl } from './ui/SegmentedControl';
import { Tooltip } from './ui/Tooltip';
import { IconCircleButton } from './ui/IconCircleButton';

// Функция для обрезания длинного текста и добавления многоточия
const truncateText = (text, maxLength = 15) => {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

// Максимальная длина названия оси перед обрезкой
const AXIS_NAME_MAX_LENGTH = 22;

const AXIS_ANIMATION_MULTIPLIERS = [1, 2, 3];

export default function VariableFontControls({ font, onSettingsChange, isAnimating = false, toggleAnimation }) {
  const [axes, setAxes] = useState([]);
  const [settings, setSettings] = useState({});
  const [animationDirections, setAnimationDirections] = useState({});
  const [axisAnimationMultipliers, setAxisAnimationMultipliers] = useState({});
  const animationRef = useRef(null);
  /** Снимок значений и направлений во время проигрывания — без лишних setState на каждом кадре */
  const animSettingsRef = useRef({});
  const animDirectionsRef = useRef({});
  const axesRef = useRef([]);
  const animationStepsRef = useRef({});
  const handleVariableSettingsChangeRef = useRef(null);
  const onSettingsChangeRef = useRef(null);
  const prevIsAnimatingRef = useRef(isAnimating);
  const isUpdatingFromExternal = useRef(false);
  // Для отслеживания редактируемого маркера
  const [editingAxis, setEditingAxis] = useState(null);
  
  // Сохраняем ID загруженного шрифта, чтобы не перезагружать его повторно
  const loadedFontId = useRef(null);
  
  const {
    getVariableAxes,
    handleVariableSettingsChange,
    variableSettings,
    resetVariableSettings,
    setSelectedFont,
    setFonts,
    saveFontSettings,
  } = useFontContext();

  handleVariableSettingsChangeRef.current = handleVariableSettingsChange;
  onSettingsChangeRef.current = onSettingsChange;

  // Для хранения предыдущих настроек (для сравнения)
  const prevSettingsRef = useRef({});

  // Синхронизация между локальным состоянием и глобальным variableSettings
  useEffect(() => {
    // Если идет обновление из внешнего источника - игнорируем
    if (isUpdatingFromExternal.current) {
      isUpdatingFromExternal.current = false;
      return;
    }
    
    // Проверяем, отличаются ли настройки
    if (JSON.stringify(settings) !== JSON.stringify(variableSettings)) {
      setSettings(variableSettings);
    }
  }, [variableSettings]);
  
  const updateFontStyleState = useCallback((targetStyle) => {
    const normalizedStyle = targetStyle === 'italic' ? 'italic' : 'normal';
    const liveWeight =
      Number.isFinite(Number(settings?.wght))
        ? Math.round(Number(settings.wght))
        : Number.isFinite(Number(font?.currentWeight))
          ? Math.round(Number(font.currentWeight))
          : Number.isFinite(Number(font?.variableAxes?.wght?.default))
            ? Math.round(Number(font.variableAxes.wght.default))
            : 400;

    setSelectedFont((prev) => {
      if (!prev || prev.id !== font?.id) return prev;
      return {
        ...prev,
        currentStyle: normalizedStyle,
        currentWeight: liveWeight,
      };
    });

    setFonts((currentFonts) => {
      if (!Array.isArray(currentFonts)) return currentFonts;
      return currentFonts.map((f) => (
        f.id === font?.id
          ? {
              ...f,
              currentStyle: normalizedStyle,
              currentWeight: liveWeight,
              lastUsedPresetName: null,
            }
          : f
      ));
    });

    saveFontSettings?.(font?.id, {
      currentStyle: normalizedStyle,
      currentWeight: liveWeight,
      lastUsedPresetName: null,
    });
  }, [font, saveFontSettings, setFonts, setSelectedFont, settings]);
  
  // Оптимизированный эффект для загрузки осей шрифта
  useEffect(() => {
    // Защита от пустого шрифта
    if (!font) {
      setAxes([]);
      return;
    }

    // Получаем ID шрифта для проверки изменений
    const fontId = font.id ? font.id : null;
    
    // Если у нас уже есть информация, что шрифт не вариативный, то сразу выходим
    if (font.isVariableFont === false) {
      setAxes([]);
      return;
    }

    // ПРИОРИТЕТ 1: Если у шрифта уже есть определенные вариативные оси
    if (font.variableAxes && Object.keys(font.variableAxes).length > 0) {
      // Преобразуем объект variableAxes в массив осей для отображения
      const fontAxes = Object.entries(font.variableAxes).map(([tag, axisData]) => {
        // Используем имя из метаданных или тег как имя, если имя не определено
        let name = axisData.name || tag;
        
        // Берем значения мин/макс/дефолт напрямую из данных оси
        return {
          tag,
          name,
          min: axisData.min,
          max: axisData.max,
          default: axisData.default
        };
      });
      
      // Проверяем поддерживаемые оси
      let filteredAxes = fontAxes;
      if (font.supportedAxes && Array.isArray(font.supportedAxes) && font.supportedAxes.length > 0) {
        // Фильтруем только те оси, которые указаны в supportedAxes
        filteredAxes = fontAxes.filter(axis => 
          font.supportedAxes.includes(axis.tag)
        );
        
        if (filteredAxes.length === 0 && fontAxes.length > 0) {
          filteredAxes = fontAxes;
        }
      }
      
      // Если есть оси для отображения, обновляем состояние
      if (filteredAxes.length > 0) {
        setAxes(filteredAxes);
        
        // Если ID шрифта изменился или мы не имеем настроек - инициализируем их
        if (fontId !== loadedFontId.current) {
          loadedFontId.current = fontId;
          
          // Устанавливаем начальные значения из осей
          const initialSettings = {};
          const initialDirections = {};
          
          // Используем только отфильтрованные оси
          filteredAxes.forEach(axis => {
            // Начальное значение - берем дефолтное значение оси
            initialSettings[axis.tag] = axis.default;
            initialDirections[axis.tag] = 1;
          });
          
          // Синхронизируем состояния
          setSettings(initialSettings);
          setAnimationDirections(initialDirections);
        }
        
        return;
      }
    }
    
    // ПРИОРИТЕТ 2 и 3: getVariableAxes из контекста шрифтов
    const loadFontAxes = async () => {
      try {
        // Получаем оси шрифта через централизованную функцию
        const fontAxes = await getVariableAxes(font);
        
        if (!fontAxes || fontAxes.length === 0) {
          setAxes([]);
          return;
        }
        
        setAxes(fontAxes);
        
        // Если ID шрифта изменился - инициализируем их
        if (fontId !== loadedFontId.current) {
          loadedFontId.current = fontId;
          
          // Устанавливаем начальные значения из осей
          const initialSettings = {};
          const initialDirections = {};
          
          fontAxes.forEach(axis => {
            initialSettings[axis.tag] = axis.default;
            initialDirections[axis.tag] = 1;
          });
          
          // Синхронизируем состояния
          setSettings(initialSettings);
          setAnimationDirections(initialDirections);
        }
      } catch (error) {
        toast.error('Не удалось проанализировать шрифт. Возможно, он не является вариативным или поврежден.');
        setAxes([]);
      }
    };
    
    loadFontAxes();

    // Очищаем анимацию при размонтировании
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [font, getVariableAxes]);

  useEffect(() => {
    axesRef.current = axes;
  }, [axes]);

  useEffect(() => {
    setAxisAnimationMultipliers((prev) =>
      axes.reduce((acc, axis) => {
        const current = Number(prev?.[axis.tag]);
        acc[axis.tag] = AXIS_ANIMATION_MULTIPLIERS.includes(current) ? current : 1;
        return acc;
      }, {})
    );
  }, [axes]);

  // Мемоизированный объект для хранения шагов анимации
  // Это предотвращает повторные вычисления при каждом рендеринге
  const animationSteps = useMemo(() => {
    return axes.reduce((steps, axis) => {
      const multiplier = axisAnimationMultipliers[axis.tag] ?? 1;
      steps[axis.tag] = ((axis.max - axis.min) / 100) * multiplier;
      return steps;
    }, {});
  }, [axes, axisAnimationMultipliers]);

  useEffect(() => {
    animationStepsRef.current = animationSteps;
  }, [animationSteps]);

  // Снимок при старте и полное применение при остановке (оси в selectedFont / списке шрифтов)
  useEffect(() => {
    const wasAnimating = prevIsAnimatingRef.current;
    prevIsAnimatingRef.current = isAnimating;

    if (isAnimating && !wasAnimating) {
      animSettingsRef.current = { ...settings };
      axes.forEach((axis) => {
        animDirectionsRef.current[axis.tag] = animationDirections[axis.tag] ?? 1;
      });
    }

    if (!isAnimating && wasAnimating) {
      const final = animSettingsRef.current;
      isUpdatingFromExternal.current = true;
      handleVariableSettingsChange(final, true);
      if (typeof onSettingsChange === 'function') {
        onSettingsChange(final);
      }
      setSettings(final);
      setAnimationDirections({ ...animDirectionsRef.current });
    }
  }, [isAnimating, settings, animationDirections, axes, handleVariableSettingsChange, onSettingsChange]);

  /** Стабильный колбэк: не зависит от settings/directions — иначе каждый кадр сбрасывался rAF */
  const animateAxes = useCallback(() => {
    const ax = axesRef.current;
    const steps = animationStepsRef.current;
    const newSettings = { ...animSettingsRef.current };
    let hasChanges = false;

    ax.forEach((axis) => {
      const tag = axis.tag;
      const current = newSettings[tag] ?? axis.default;
      const direction = animDirectionsRef.current[tag] ?? 1;
      const step = steps[tag];
      let newValue = current + step * direction;

      if (newValue >= axis.max) {
        newValue = axis.max;
        animDirectionsRef.current[tag] = -1;
      } else if (newValue <= axis.min) {
        newValue = axis.min;
        animDirectionsRef.current[tag] = 1;
      }

      if (newValue !== current) {
        newSettings[tag] = newValue;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      animSettingsRef.current = newSettings;
      isUpdatingFromExternal.current = true;
      const apply = handleVariableSettingsChangeRef.current;
      if (typeof apply === 'function') {
        apply(newSettings, false, null, { skipSideEffects: true });
      }
      onSettingsChangeRef.current?.(newSettings);
    }

    animationRef.current = requestAnimationFrame(animateAxes);
  }, []);

  // Один непрерывный цикл rAF на время анимации (без пересоздания из-за смены settings)
  useEffect(() => {
    if (isAnimating && axes.length > 0) {
      if (!animationRef.current) {
        animationRef.current = requestAnimationFrame(animateAxes);
      }
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
      };
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, [isAnimating, axes.length, animateAxes]);

  // Оптимизированный обработчик изменения значения слайдера
  const handleSliderChange = useCallback((tag, value, isDragging = false) => {
    if (!settings || !tag) return 0;
    
    // Если идет анимация или редактирование другой оси, игнорируем
    if (isAnimating || (editingAxis && editingAxis !== tag)) return 0;
    
    // Округляем значение до целого числа
    const roundedValue = Math.round(value);
    
    // Проверяем, изменилось ли значение по сравнению с текущим
    if (settings[tag] === roundedValue) {
      return roundedValue; // Если значение не изменилось, ничего не делаем
    }
    
    // Создаем копию текущих настроек
    const newSettings = { ...settings, [tag]: roundedValue };
    
    // Проверяем, является ли изменение значимым (> 3 единиц)
    // Только для режима перетаскивания, чтобы уменьшить количество обновлений
    const isSignificant = !isDragging || hasSignificantChanges(prevSettingsRef.current, newSettings, 3);
    
    // Если изменение не значимое и это режим перетаскивания, просто обновляем локальное состояние без вызова глобальных обновлений
    if (isDragging && !isSignificant) {
      setSettings(newSettings);
      return roundedValue;
    }
    
    setSettings(newSettings);
    
    // Сохраняем текущие настройки как предыдущие для следующего сравнения
    prevSettingsRef.current = { ...newSettings };
    
    // Отмечаем, что обновление идет из локального источника
    isUpdatingFromExternal.current = true;
    
    // В режиме перетаскивания используем троттлинг для обновлений CSS
    if (isDragging) {
      // При перетаскивании используем легкую версию обновления, которая не вызывает полного ререндеринга
      handleVariableSettingsChange(newSettings, false);
    } else {
      // Для обычных кликов используем полное обновление с ререндерингом
      handleVariableSettingsChange(newSettings, true);
    }

    // Уведомляем родителя об изменениях
    if (typeof onSettingsChange === 'function') {
      onSettingsChange(newSettings);
    }
    
    return roundedValue;
  }, [settings, handleVariableSettingsChange, onSettingsChange, isAnimating, editingAxis]);
  
  // Сброс всех слайдеров на значения по умолчанию
  const handleResetAll = useCallback(() => {
    // Создаем объект для хранения дефолтных значений и убеждаемся, что у нас есть оси
    if (axes.length === 0) {
      return;
    }
    
    // Останавливаем анимацию, если она активна
    if (isAnimating && typeof toggleAnimation === 'function') {
      toggleAnimation();
    }
    
    // Принудительно очищаем анимацию
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Создаем объект с дефолтными значениями осей
    const defaultSettings = {};
    
    axes.forEach(axis => {
      defaultSettings[axis.tag] = axis.default;
    });
    
    // Сбрасываем направления анимации
    const defaultDirections = {};
    axes.forEach(axis => {
      defaultDirections[axis.tag] = 1;
    });
    
    // Обновляем локальное состояние
    setSettings(defaultSettings);
    setAnimationDirections(defaultDirections);
    setAxisAnimationMultipliers(
      axes.reduce((acc, axis) => {
        acc[axis.tag] = 1;
        return acc;
      }, {})
    );
    
    // Отмечаем, что обновление идет из локального источника
    isUpdatingFromExternal.current = true;
    
    // Используем resetVariableSettings из хука для централизованной обработки
    resetVariableSettings();
    updateFontStyleState('normal');
    
    // Также уведомляем родительский компонент о сбросе настроек
    if (typeof onSettingsChange === 'function') {
      onSettingsChange(defaultSettings);
    }
    
    toast.info('Все настройки сброшены до значений по умолчанию');
  }, [axes, isAnimating, toggleAnimation, resetVariableSettings, onSettingsChange, updateFontStyleState]);

  const cycleAxisAnimationMultiplier = useCallback((tag) => {
    setAxisAnimationMultipliers((prev) => {
      const current = prev[tag] ?? 1;
      const currentIndex = AXIS_ANIMATION_MULTIPLIERS.indexOf(current);
      const nextMultiplier =
        currentIndex >= 0
          ? AXIS_ANIMATION_MULTIPLIERS[(currentIndex + 1) % AXIS_ANIMATION_MULTIPLIERS.length]
          : 1;
      return {
        ...prev,
        [tag]: nextMultiplier,
      };
    });
  }, []);

  // Мемоизированное значение для проверки наличия осей
  const axesForDisplay = useMemo(() => {
    if (!Array.isArray(axes)) return [];
    if (font?.italicMode === 'axis-ital') {
      // При axis-ital осью управляет Roman/Italic toggle, чтобы не было дублирующего UI.
      return axes.filter((axis) => axis?.tag !== 'ital');
    }
    return axes;
  }, [axes, font?.italicMode]);
  const hasAxes = useMemo(() => axesForDisplay.length > 0, [axesForDisplay]);
  const canShowItalicControl = useMemo(() => variableFontShowsItalicControl(font), [font]);
  const italicControlValue = useMemo(() => {
    if (!canShowItalicControl) return '0';
    if (font?.italicMode === 'axis-ital') {
      return Number(settings?.ital ?? font?.variableAxes?.ital?.default ?? 0) >= 1 ? '1' : '0';
    }
    return font?.currentStyle === 'italic' ? '1' : '0';
  }, [canShowItalicControl, font, settings]);
  const handleItalicToggle = useCallback((nextValue) => {
    if (!font || isAnimating) return;
    const wantsItalic = nextValue === '1';
    const targetStyle = wantsItalic ? 'italic' : 'normal';

    if (font.italicMode === 'axis-ital') {
      const nextSettings = { ...settings, ital: wantsItalic ? 1 : 0 };
      setSettings(nextSettings);
      prevSettingsRef.current = { ...nextSettings };
      isUpdatingFromExternal.current = true;
      handleVariableSettingsChange(nextSettings, true);
      onSettingsChangeRef.current?.(nextSettings);
      updateFontStyleState(targetStyle);
      return;
    }

    if (font.italicMode === 'axis-slnt') {
      const slantAxis = typeof font.variableAxes?.slnt === 'object' ? font.variableAxes.slnt : null;
      const targetSlnt = wantsItalic ? (slantAxis?.min ?? -10) : (slantAxis?.default ?? 0);
      const nextSettings = { ...settings, slnt: Math.round(Number(targetSlnt)) };
      setSettings(nextSettings);
      prevSettingsRef.current = { ...nextSettings };
      isUpdatingFromExternal.current = true;
      handleVariableSettingsChange(nextSettings, true);
      onSettingsChangeRef.current?.(nextSettings);
      updateFontStyleState(targetStyle);
      return;
    }

    updateFontStyleState(targetStyle);
  }, [font, handleVariableSettingsChange, isAnimating, settings, updateFontStyleState]);

  if (!hasAxes && !canShowItalicControl) {
    return (
      <div className="text-sm text-gray-500 p-4 border border-gray-200 rounded-md bg-white text-center">
        Шрифт не имеет вариативных осей
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-3.5 flex min-w-0 items-center justify-between gap-2">
        <h2 className="min-w-0 shrink uppercase font-semibold text-sm text-gray-900">Variable Axes</h2>
        <div className="flex shrink-0 items-center gap-2">
          <Tooltip content={isAnimating ? 'Остановить анимацию' : 'Воспроизвести анимацию'}>
            <IconCircleButton
              variant="toolbar"
              pressed={isAnimating}
              onClick={toggleAnimation}
              aria-label={isAnimating ? 'Остановить анимацию' : 'Воспроизвести анимацию'}
            >
              {isAnimating ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                </svg>
              )}
            </IconCircleButton>
          </Tooltip>

          <Tooltip content="Сбросить все оси">
            <IconCircleButton variant="toolbar" onClick={handleResetAll} aria-label="Сбросить все оси">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </IconCircleButton>
          </Tooltip>
        </div>
      </div>

      {canShowItalicControl ? (
        <div className="mb-3.5">
          <SegmentedControl
            variant="surface"
            value={italicControlValue}
            onChange={handleItalicToggle}
            disabled={isAnimating}
            options={[
              { value: '0', label: 'Roman', title: 'Roman (0)' },
              { value: '1', label: 'Italic', title: 'Italic (1)' },
            ]}
          />
        </div>
      ) : null}

      {axesForDisplay.map(axis => {
        const value = settings[axis.tag] !== undefined ? settings[axis.tag] : axis.default;
        const axisAnimationMultiplier = axisAnimationMultipliers[axis.tag] ?? 1;
        
        // Получаем имя оси с учетом возможных форматов
        const axisName = typeof axis.name === 'object' 
          ? (axis.name.en || Object.values(axis.name)[0] || axis.tag) 
          : (axis.name || axis.tag);
        
        // Обрезаем длинное название
        const truncatedName = truncateText(axisName, AXIS_NAME_MAX_LENGTH);
        
        return (
          <div key={axis.tag} className="mb-3.5">
            <div className="flex justify-between mb-0.5">
              <div className="text-[0.75rem] font-medium text-gray-600 flex items-center h-5 max-w-[75%] hover:text-gray-950 transition-colors">
                <Tooltip content={axisName} className="min-w-0">
                  <span className="truncate mr-1">{truncatedName}</span>
                </Tooltip>
                <span className="text-[0.7rem] font-normal text-gray-500 px-0.5 py-px rounded-sm whitespace-nowrap flex-shrink-0 leading-tight">({axis.tag})</span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <Tooltip content="Скорость анимации оси">
                  <button
                    type="button"
                    className="min-w-[1rem] text-right text-[0.75rem] font-normal text-gray-800 transition-colors hover:text-accent"
                    onClick={() => cycleAxisAnimationMultiplier(axis.tag)}
                    aria-label={`Скорость анимации оси ${axisName}: x${axisAnimationMultiplier.toFixed(1)}`}
                  >
                    {`x${axisAnimationMultiplier.toFixed(1)}`}
                  </button>
                </Tooltip>
                <Tooltip content="Сбросить к значению по умолчанию">
                  <button 
                    className={`text-gray-800 hover:text-accent w-4 h-4 flex items-center justify-center ${isAnimating ? 'opacity-50 cursor-default' : ''}`}
                    onClick={() => {
                      if (!isAnimating) {
                        handleSliderChange(axis.tag, axis.default);
                      }
                    }}
                    disabled={isAnimating}
                    aria-label="Сбросить к значению по умолчанию"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                    </svg>
                  </button>
                </Tooltip>
              </div>
            </div>
            
            <DraggableValueRangeSlider
              min={axis.min}
              max={axis.max}
              step={1}
              value={value}
              disabled={isAnimating}
              defaultMarkerValue={axis.default}
              formatDisplay={(v) => String(Math.round(v))}
              interactionLockId={axis.tag}
              onInteractionLock={setEditingAxis}
              onChange={(v) => handleSliderChange(axis.tag, v, false)}
              onMarkerDrag={(v) => handleSliderChange(axis.tag, v, true)}
              onMarkerDragEnd={(v) => {
                const rounded = Math.round(v);
                const currentSettings = { ...settings, [axis.tag]: rounded };
                handleVariableSettingsChange(currentSettings, true);
              }}
            />
          </div>
        );
      })}
    </div>
  );
} 
