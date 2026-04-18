import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useFontContext } from '../contexts/FontContext';
import { toast } from 'react-toastify';
import { hasSignificantChanges } from '../utils/cssGenerator';
import DraggableValueRangeSlider from './ui/DraggableValueRangeSlider';
import { NativeSelect } from './ui/NativeSelect';
import { nativeSelectFieldClass } from './ui/nativeSelectFieldClasses';

// Функция для обрезания длинного текста и добавления многоточия
const truncateText = (text, maxLength = 15) => {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

// Максимальная длина названия оси перед обрезкой
const AXIS_NAME_MAX_LENGTH = 22;

export default function VariableFontControls({ font, onSettingsChange, isAnimating = false, toggleAnimation, animationSpeed = 1, setAnimationSpeed }) {
  const [axes, setAxes] = useState([]);
  const [settings, setSettings] = useState({});
  const [animationDirections, setAnimationDirections] = useState({});
  const animationRef = useRef(null);
  const isUpdatingFromExternal = useRef(false);
  // Для отслеживания редактируемого маркера
  const [editingAxis, setEditingAxis] = useState(null);
  
  // Локальное состояние для скорости анимации (используется, если не передан setAnimationSpeed)
  const [localAnimationSpeed, setLocalAnimationSpeed] = useState(animationSpeed);
  
  // Состояние для формата экспорта
  const [exportFormat, setExportFormat] = useState('ttf');
  
  // Актуальное значение скорости анимации
  const effectiveAnimationSpeed = useMemo(() => {
    // Контролируемый режим: значение из родителя (иначе слайдер «залипает» на дефолте при отсутствии setAnimationSpeed)
    if (typeof setAnimationSpeed === 'function') {
      const v = animationSpeed;
      return Number.isFinite(v) ? v : localAnimationSpeed;
    }
    return localAnimationSpeed;
  }, [animationSpeed, localAnimationSpeed, setAnimationSpeed]);
  
  // Сохраняем ID загруженного шрифта, чтобы не перезагружать его повторно
  const loadedFontId = useRef(null);
  
  const {
    getVariableAxes,
    handleVariableSettingsChange,
    createStaticFont,
    downloadStaticFont,
    variableSettings,
    resetVariableSettings,
  } = useFontContext();

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
  
  // Обработчик изменения скорости анимации
  const handleAnimationSpeedChange = useCallback((value) => {
    if (typeof setAnimationSpeed === 'function') {
      // Если передана внешняя функция обновления, используем ее
      setAnimationSpeed(value);
    } else {
      // Иначе обновляем локальное состояние
      setLocalAnimationSpeed(value);
    }
  }, [setAnimationSpeed]);
  
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

  // Мемоизированный объект для хранения шагов анимации
  // Это предотвращает повторные вычисления при каждом рендеринге
  const animationSteps = useMemo(() => {
    return axes.reduce((steps, axis) => {
      steps[axis.tag] = ((axis.max - axis.min) / 100) * effectiveAnimationSpeed;
      return steps;
    }, {});
  }, [axes, effectiveAnimationSpeed]);

  // Обновление анимации с использованием useCallback для предотвращения перерисовок
  const animateAxes = useCallback(() => {
    const newSettings = { ...settings };
    let hasChanges = false;
    
    axes.forEach(axis => {
      const tag = axis.tag;
      const current = settings[tag] || axis.default;
      const direction = animationDirections[tag];
      const step = animationSteps[tag];
      
      let newValue = current + (step * direction);
      
      // Проверяем границы
      if (newValue >= axis.max) {
        newValue = axis.max;
        // Меняем направление
        setAnimationDirections(prev => ({
          ...prev,
          [tag]: -1
        }));
      } else if (newValue <= axis.min) {
        newValue = axis.min;
        // Меняем направление
        setAnimationDirections(prev => ({
          ...prev,
          [tag]: 1
        }));
      }
      
      if (newValue !== current) {
        newSettings[tag] = newValue;
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setSettings(newSettings);
      
      // Отмечаем, что обновление идет из локального источника
      isUpdatingFromExternal.current = true;
      
      // Обновляем глобальное состояние и уведомляем родителя
      handleVariableSettingsChange(newSettings);
      
      if (typeof onSettingsChange === 'function') {
        onSettingsChange(newSettings);
      }
    }
    
    // Запускаем следующий кадр анимации
    animationRef.current = requestAnimationFrame(animateAxes);
  }, [axes, settings, animationDirections, animationSteps, handleVariableSettingsChange, onSettingsChange]);

  // Обновление анимации
  useEffect(() => {
    if (isAnimating && axes.length > 0) {
      // Запускаем анимацию только если она еще не запущена
      if (!animationRef.current) {
        animationRef.current = requestAnimationFrame(animateAxes);
      }
      
      // Очистка при размонтировании
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
      };
    } else if (animationRef.current) {
      // Останавливаем анимацию, если активна
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, [isAnimating, axes, animateAxes]);

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
    
    // Отмечаем, что обновление идет из локального источника
    isUpdatingFromExternal.current = true;
    
    // Используем resetVariableSettings из хука для централизованной обработки
    resetVariableSettings();
    
    // Также уведомляем родительский компонент о сбросе настроек
    if (typeof onSettingsChange === 'function') {
      onSettingsChange(defaultSettings);
    }
    
    toast.info('Все настройки сброшены до значений по умолчанию');
  }, [axes, isAnimating, toggleAnimation, resetVariableSettings, onSettingsChange]);

  // Обработчик для кнопки создания статического шрифта с использованием useCallback
  const handleCreateStaticFont = useCallback(() => {
    // Используем функцию downloadStaticFont из useFontExport для прямого скачивания
    if (downloadStaticFont && font && settings) {
      downloadStaticFont(font, settings, exportFormat);
    } else {
      // Fallback на createStaticFont если downloadStaticFont недоступен
      createStaticFont();
    }
  }, [downloadStaticFont, createStaticFont, font, settings, exportFormat]);

  // Мемоизированное значение для проверки наличия осей
  const hasAxes = useMemo(() => axes.length > 0, [axes]);

  if (!hasAxes) {
    return (
      <div className="text-sm text-gray-500 p-4 border border-gray-200 rounded-md bg-white text-center">
        Шрифт не имеет вариативных осей
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <button 
          className={`flex items-center justify-center w-8 h-8 rounded-full ${isAnimating ? 'bg-accent text-white' : 'bg-white border border-gray-200 text-accent'}`}
          onClick={toggleAnimation}
          title={isAnimating ? "Остановить анимацию" : "Воспроизвести анимацию"}
        >
          {isAnimating ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
          )}
        </button>

        <button 
          className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-200 text-accent hover:bg-accent-soft transition-colors relative group"
          onClick={handleResetAll}
          title="Сбросить все настройки"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          <span className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded transition-opacity whitespace-nowrap">
            Сбросить все оси
          </span>
        </button>

        <button 
          className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-200 text-accent"
          title="Аудио режим"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
          </svg>
        </button>
      </div>

      <div className="mb-4 rounded-lg bg-gray-50 p-3">
        <div className="mb-2">
          <p className="text-xs font-semibold text-gray-900">Скорость анимации</p>
          <p className="mt-0.5 text-[0.65rem] leading-snug text-gray-500">
          </p>
        </div>
        <div className="variable-font-slider-container">
          <DraggableValueRangeSlider
            min={0.1}
            max={5}
            step={0.1}
            value={Math.min(5, Math.max(0.1, Number(effectiveAnimationSpeed) || 1))}
            onChange={handleAnimationSpeedChange}
            formatDisplay={(v) => Number(v).toFixed(1)}
          />
        </div>
      </div>

      {axes.map(axis => {
        const value = settings[axis.tag] !== undefined ? settings[axis.tag] : axis.default;
        
        // Получаем имя оси с учетом возможных форматов
        const axisName = typeof axis.name === 'object' 
          ? (axis.name.en || Object.values(axis.name)[0] || axis.tag) 
          : (axis.name || axis.tag);
        
        // Обрезаем длинное название
        const truncatedName = truncateText(axisName, AXIS_NAME_MAX_LENGTH);
        
        return (
          <div key={axis.tag} className="mb-4">
            <div className="flex justify-between mb-1">
              <div className="text-[0.75rem] font-medium text-gray-900 flex items-center h-5 max-w-[80%] hover:text-gray-950 transition-colors">
                <span className="truncate mr-1" title={axisName}>{truncatedName}</span>
                <span className="text-[0.7rem] font-normal text-gray-500 px-0.5 py-px rounded-sm whitespace-nowrap flex-shrink-0 leading-tight">({axis.tag})</span>
              </div>
              <button 
                className={`text-gray-400 hover:text-accent w-4 h-4 flex items-center justify-center ${isAnimating ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => {
                  if (!isAnimating) {
                    // Сбрасываем только эту ось к дефолтному значению
                    handleSliderChange(axis.tag, axis.default);
                  }
                }}
                title="Сбросить к значению по умолчанию"
                disabled={isAnimating}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-2.5 h-2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
              </button>
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
      
      <div className="pt-4 mt-4 border-t border-gray-200">
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-800 mb-1">
            Формат экспорта:
          </label>
          <NativeSelect
            id="vf-export-format"
            className={nativeSelectFieldClass({ compact: true })}
            value={exportFormat || 'ttf'}
            onChange={(e) => setExportFormat(e.target.value)}
            aria-label="Формат экспорта статического файла"
          >
            <option value="ttf">TTF (TrueType Font)</option>
            <option value="otf">OTF (OpenType Font)</option>
            <option value="woff">WOFF (Web Open Font)</option>
            <option value="woff2">WOFF2 (Web Open Font 2)</option>
          </NativeSelect>
        </div>
        <button 
          className="w-full py-2 text-xs text-center bg-accent text-white rounded-md font-normal hover:bg-accent-hover transition-colors shadow-sm hover:shadow"
          onClick={handleCreateStaticFont}
        >
          Generate Static Font File
        </button>
      </div>
    </div>
  );
} 