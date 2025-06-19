import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useFontManager } from '../hooks/useFontManager';
import { toast } from 'react-toastify';
// Импортируем оптимизированные функции из cssGenerator
import { debouncedUpdateFontFaceIfNeeded, hasSignificantChanges } from '../utils/cssGenerator';

// Стили для скрытия стандартного маркера в range input
const sliderStyles = `
  /* Ограничиваем область действия стилей только нашим компонентом */
  .variable-font-slider-container input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 0;
    height: 0;
    opacity: 0;
  }
  
  .variable-font-slider-container input[type="range"]::-moz-range-thumb {
    width: 0;
    height: 0;
    opacity: 0;
    border: none;
  }
  
  .variable-font-slider-container input[type="range"]::-ms-thumb {
    width: 0;
    height: 0;
    opacity: 0;
  }

  /* Стили для скрытия стрелок в числовом поле ввода */
  input[type="number"].no-arrows::-webkit-inner-spin-button,
  input[type="number"].no-arrows::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  
  input[type="number"].no-arrows {
    -moz-appearance: textfield;
  }
`;

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
  const [editValue, setEditValue] = useState("");
  // Создаем объект для хранения рефов для каждой оси
  const inputRefs = useRef({});
  
  // Для перетаскивания маркера
  const [isDragging, setIsDragging] = useState(false);
  const [activeAxis, setActiveAxis] = useState(null); 
  const dragInfo = useRef(null);
  const clickTimer = useRef(null);
  const markerRefs = useRef({});
  
  // Локальное состояние для скорости анимации (используется, если не передан setAnimationSpeed)
  const [localAnimationSpeed, setLocalAnimationSpeed] = useState(animationSpeed);
  
  // Состояние для формата экспорта
  const [exportFormat, setExportFormat] = useState('ttf');
  
  // Актуальное значение скорости анимации
  const effectiveAnimationSpeed = useMemo(() => {
    // Если передано внешнее значение, используем его, иначе используем локальное
    return animationSpeed || localAnimationSpeed;
  }, [animationSpeed, localAnimationSpeed]);
  
  // Сохраняем ID загруженного шрифта, чтобы не перезагружать его повторно
  const loadedFontId = useRef(null);
  
  // Используем хук useFontManager для доступа к общим функциям работы со шрифтами
  const { 
    getVariableAxes, 
    handleVariableSettingsChange, 
    createStaticFont,
    downloadStaticFont,
    variableSettings,
    resetVariableSettings
  } = useFontManager();

  // Для хранения предыдущих настроек (для сравнения)
  const prevSettingsRef = useRef({});

  // Синхронизация между локальным состоянием и глобальным из useFontManager
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
    
    // ПРИОРИТЕТ 2 и 3: Используем getVariableAxes из хука useFontManager
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
    
    // Если значение изменилось значительно, логируем (для отладки)
    if (isSignificant && !isDragging) {
      // console.log(`Значимое изменение оси ${tag}: ${roundedValue}`); // Удаляем лог
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

  // Функции для перетаскивания маркера
  const handleMarkerMouseDown = useCallback((e, axis, value, sliderWidth) => {
    if (isAnimating) return;
    
    console.log(`[MarkerMouseDown] Начало для оси ${axis.tag}, значение: ${value}`);
    
    // Сразу устанавливаем активную ось и фиксируем отсутствие перетаскивания
    console.log(`[MarkerMouseDown] Устанавливаем activeAxis: ${axis.tag}`);
    setActiveAxis(axis.tag);
    setIsDragging(false);
    
    // Получаем размеры и позицию слайдера для более точных расчетов
    const sliderRect = e.currentTarget.parentElement.getBoundingClientRect();
    const markerWidth = e.currentTarget.offsetWidth;
    const effectiveSliderWidth = sliderRect.width;
    
    // Учитываем отступы для маркера (5% с каждой стороны)
    const effectiveMin = axis.min;
    const effectiveMax = axis.max;
    const paddingPercent = 5; // 5% отступ с каждой стороны
    const paddingPx = (effectiveSliderWidth * paddingPercent) / 100;
    
    // Сохраняем начальную информацию для перетаскивания
    const startX = e.clientX;
    const startValue = value;
    
    // Сохраняем информацию для перетаскивания
    dragInfo.current = {
      axis: axis.tag,
      startX,
      startValue,
      sliderWidth: effectiveSliderWidth,
      range: effectiveMax - effectiveMin,
      minValue: effectiveMin,
      maxValue: effectiveMax,
      moveStarted: false, // Флаг, указывающий, было ли начато перетаскивание
      sliderRect,
      markerWidth,
      paddingPx,
      lastUpdateTime: 0, // Время последнего обновления для троттлинга
      animationFrameId: null, // ID requestAnimationFrame для отмены
      pendingValue: null, // Ожидающее значение для обновления в следующем кадре анимации
      lastValue: startValue, // Последнее обновленное значение для финального сохранения
      updateCounter: 0, // Счетчик обновлений для отладки
      activeAxis: axis.tag // Сохраняем activeAxis в dragInfo для надежности
    };
    
    // Начинаем таймер для активации режима редактирования, если не начнется перетаскивание
    clickTimer.current = setTimeout(() => {
      // Только если не начали перетаскивание и это все еще активная ось
      if (!dragInfo.current?.moveStarted && activeAxis === axis.tag) {
        // Активируем режим редактирования
        setEditingAxis(axis.tag);
        setEditValue(Math.round(value).toString());
        
        // Используем setTimeout, чтобы дать React время отрендерить инпут перед фокусировкой
        setTimeout(() => {
          if (inputRefs.current[axis.tag]) {
            inputRefs.current[axis.tag].focus();
            inputRefs.current[axis.tag].select();
          }
        }, 50);
        
        // Сбрасываем таймер
        clickTimer.current = null;
      }
    }, 300); // Задержка для режима редактирования
    
    // Функция для обновления значения с использованием requestAnimationFrame
    const scheduleValueUpdate = (newValue) => {
      // Отменяем предыдущий запрос анимации, если он есть
      if (dragInfo.current.animationFrameId) {
        cancelAnimationFrame(dragInfo.current.animationFrameId);
      }
      
      // Сохраняем ожидающее значение
      dragInfo.current.pendingValue = newValue;
      dragInfo.current.lastValue = newValue; // Сохраняем как последнее значение
      
      // Планируем обновление в следующем кадре анимации
      dragInfo.current.animationFrameId = requestAnimationFrame(() => {
        if (!dragInfo.current) return; // Проверка на случай, если перетаскивание завершилось
        
        // Увеличиваем счетчик обновлений
        dragInfo.current.updateCounter++;
        
        // Применяем обновление с флагом isDragging, чтобы оптимизировать обработку
        if (dragInfo.current.pendingValue !== null) {
          handleSliderChange(axis.tag, dragInfo.current.pendingValue, true);
          dragInfo.current.pendingValue = null;
          dragInfo.current.animationFrameId = null;
        }
      });
    };
    
    // Функция обработки движения мыши с троттлингом
    const handleMouseMove = (moveEvent) => {
      // Если активная ось не соответствует или нет информации о перетаскивании, игнорируем
      if (!dragInfo.current || dragInfo.current.axis !== axis.tag) return;
      
      // Проверяем, что кнопка мыши все еще нажата
      if (moveEvent.buttons === 0) {
        // Кнопка отпущена, очищаем всё
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        if (clickTimer.current) {
          clearTimeout(clickTimer.current);
          clickTimer.current = null;
        }
        
        // Отменяем запланированное обновление
        if (dragInfo.current.animationFrameId) {
          cancelAnimationFrame(dragInfo.current.animationFrameId);
        }
        
        dragInfo.current = null;
        setIsDragging(false);
        
        // НЕ сбрасываем activeAxis здесь - это должно происходить в handleMouseUp
        
        return;
      }
      
      // Определяем величину перемещения
      const moveX = moveEvent.clientX - dragInfo.current.startX;
      
      // Если перемещение достаточно большое, начинаем перетаскивание
      if (!dragInfo.current.moveStarted && Math.abs(moveX) > 3) {
        // Отмечаем начало перетаскивания
        dragInfo.current.moveStarted = true;
        setIsDragging(true);
        
        // Отменяем таймер для редактирования, так как начали перетаскивание
        if (clickTimer.current) {
          clearTimeout(clickTimer.current);
          clickTimer.current = null;
        }
      }
      
      // Если перетаскивание еще не начато, выходим
      if (!dragInfo.current.moveStarted) return;
      
      // Рассчитываем новое значение на основе перемещения, учитывая отступы
      const effectiveWidth = dragInfo.current.sliderWidth - (dragInfo.current.paddingPx * 2);
      const mouseXRelative = moveEvent.clientX - dragInfo.current.sliderRect.left;
      
      // Ограничиваем позицию мыши в пределах эффективной области слайдера
      const boundedX = Math.max(
        dragInfo.current.paddingPx, 
        Math.min(mouseXRelative, dragInfo.current.sliderWidth - dragInfo.current.paddingPx)
      );
      
      // Рассчитываем процент от эффективной ширины
      const effectivePercent = (boundedX - dragInfo.current.paddingPx) / effectiveWidth;
      
      // Вычисляем значение на основе процента
      let newValue = dragInfo.current.minValue + (effectivePercent * dragInfo.current.range);
      
      // Ограничиваем значение в допустимых пределах
      newValue = Math.max(dragInfo.current.minValue, Math.min(dragInfo.current.maxValue, newValue));
      
      // Применяем троттлинг, чтобы ограничить частоту обновлений
      const now = performance.now();
      const timeSinceLastUpdate = now - (dragInfo.current.lastUpdateTime || 0);
      
      // Обновляем не чаще чем каждые 16.7мс (60fps) для предотвращения моргания
      if (timeSinceLastUpdate >= 16.7) {
        dragInfo.current.lastUpdateTime = now;
        
        // Планируем обновление значения в следующем кадре анимации
        scheduleValueUpdate(newValue);
      }
    };
    
    // Функция обработки отпускания кнопки мыши
    const handleMouseUp = () => {
      console.log(`[MouseUp] isDragging: ${isDragging}, activeAxis: ${activeAxis}, dragInfo:`, dragInfo.current);
      
      // Если не было перетаскивания, это простой клик
      if (!isDragging && activeAxis && clickTimer.current) {
        clearTimeout(clickTimer.current);
        // Устанавливаем ось для редактирования и значение
        setEditingAxis(activeAxis);
        const value = settings[activeAxis];
        setEditValue(value !== undefined ? value.toString() : "");
      }
      
      // Отменяем запланированное обновление, если оно есть
      if (dragInfo.current?.animationFrameId) {
        cancelAnimationFrame(dragInfo.current.animationFrameId);
        dragInfo.current.animationFrameId = null;
      }
      
      // Проверяем было ли перетаскивание по moveStarted в dragInfo
      const wasDragging = isDragging || (dragInfo.current && dragInfo.current.moveStarted);
      // Используем activeAxis из dragInfo.current для надежности, если React состояние не готово
      const effectiveActiveAxis = activeAxis || dragInfo.current?.activeAxis;
      
      console.log(`[MouseUp] wasDragging: ${wasDragging}, moveStarted: ${dragInfo.current?.moveStarted}, activeAxis: ${activeAxis}, effectiveActiveAxis: ${effectiveActiveAxis}`);
      
      // Если было перетаскивание и есть изменения, принудительно обновляем CSS
      if (wasDragging && effectiveActiveAxis) {
        console.log(`[MouseUp] Финальное обновление для оси ${effectiveActiveAxis}`);
        
        // Получаем АКТУАЛЬНОЕ значение из dragInfo.current.lastValue или из последнего обновления
        // Это необходимо, потому что React состояние может быть устаревшим из-за асинхронности
        const actualValue = dragInfo.current?.lastValue !== undefined 
          ? dragInfo.current.lastValue 
          : settings[effectiveActiveAxis];
        
        console.log(`[MouseUp] Актуальное значение для ${effectiveActiveAxis}: ${actualValue} (из settings: ${settings[effectiveActiveAxis]})`);
        
        // Формируем настройки с актуальным значением
        const currentSettings = { 
          ...settings,
          [effectiveActiveAxis]: actualValue
        };
        
        // Отправляем финальное обновление с флагом isFinalUpdate для визуальной синхронизации
        handleVariableSettingsChange(currentSettings, true);
        
        // Если был счетчик обновлений в dragInfo, выводим его для отладки
        if (dragInfo.current?.updateCounter) {
          console.log(`[MouseUp] Завершено перетаскивание оси ${effectiveActiveAxis} с ${dragInfo.current.updateCounter} обновлениями`);
        }
        
        // Добавляем задержку перед разблокировкой UI для предотвращения моргания
        setTimeout(() => {
          setIsDragging(false);
          setActiveAxis(null);
          dragInfo.current = null;
        }, 100);
      } else {
        console.log(`[MouseUp] Простое событие без перетаскивания`);
        // Сбрасываем состояние перетаскивания
        setIsDragging(false);
        setActiveAxis(null);
        dragInfo.current = null;
      }
      
      // Удаляем глобальные обработчики
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    // Добавляем обработчики для перетаскивания
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    console.log(`[MarkerMouseDown] Обработчики добавлены для оси ${axis.tag}`);
    
    e.preventDefault();
    e.stopPropagation();
  }, [isAnimating, activeAxis, isDragging, handleSliderChange, settings]);

  // Отписываемся от событий при размонтировании компонента
  useEffect(() => {
    return () => {
      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
      }
    };
  }, []);

  if (!hasAxes) {
    return (
      <div className="text-sm text-gray-500 p-4 border border-blue-100 rounded-md bg-white text-center">
        Шрифт не имеет вариативных осей
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Внедряем стили непосредственно в компонент */}
      <style>{sliderStyles}</style>
      
      <div className="flex items-center gap-2 mb-3">
        <button 
          className={`flex items-center justify-center w-8 h-8 rounded-full ${isAnimating ? 'bg-blue-500 text-white' : 'bg-white border border-blue-300 text-blue-500'}`}
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
          className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-blue-300 text-blue-500 hover:bg-blue-50 transition-colors relative group"
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
          className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-blue-300 text-blue-500"
          title="Аудио режим"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
          </svg>
        </button>
      </div>
      
      {isAnimating && (
        <div className="animation-speed variable-font-slider-container">
          <label>Скорость анимации</label>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={effectiveAnimationSpeed}
            onChange={(e) => handleAnimationSpeedChange(parseFloat(e.target.value))}
          />
          <span>{effectiveAnimationSpeed.toFixed(1)}</span>
        </div>
      )}
      
      {axes.map(axis => {
        const value = settings[axis.tag] !== undefined ? settings[axis.tag] : axis.default;
        const percent = ((value - axis.min) / (axis.max - axis.min)) * 100;
        
        // Получаем имя оси с учетом возможных форматов
        const axisName = typeof axis.name === 'object' 
          ? (axis.name.en || Object.values(axis.name)[0] || axis.tag) 
          : (axis.name || axis.tag);
        
        // Обрезаем длинное название
        const truncatedName = truncateText(axisName, AXIS_NAME_MAX_LENGTH);
        
        return (
          <div key={axis.tag} className="mb-4">
            <div className="flex justify-between mb-1">
              <div className="text-[0.75rem] font-medium text-blue-700 flex items-center h-5 max-w-[80%] hover:text-blue-800 transition-colors">
                <span className="truncate mr-1" title={axisName}>{truncatedName}</span>
                <span className="text-[0.6rem] font-medium text-gray-500 bg-blue-50 border border-blue-100 px-0.5 py-px rounded-sm whitespace-nowrap flex-shrink-0 leading-tight">({axis.tag})</span>
              </div>
              <button 
                className={`text-blue-400 hover:text-blue-600 w-4 h-4 flex items-center justify-center ${isAnimating ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            
            <div className="relative h-10 flex items-center variable-font-slider-container">
              <div className="absolute left-0 right-0 h-1 bg-gray-200 rounded-full">
                {/* Линия прогресса */}
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-300 rounded-full" 
                  style={{ width: `${percent}%` }}
                ></div>
                
                {/* Маркер дефолтного значения */}
                <div 
                  className="absolute h-4 w-1 bg-yellow-400 rounded-full top-1/2 transform -translate-y-1/2" 
                  style={{ left: `${((axis.default - axis.min) / (axis.max - axis.min)) * 95}%` }}
                  title="Значение по умолчанию"
                ></div>
              </div>
              
              <input 
                type="range"
                min={axis.min}
                max={axis.max}
                step="1"
                value={value}
                onChange={e => handleSliderChange(axis.tag, parseFloat(e.target.value))}
                disabled={isAnimating}
                className="absolute left-0 right-0 h-5 appearance-none bg-transparent cursor-pointer z-20"
                style={{
                  WebkitAppearance: 'none',
                  appearance: 'none'
                }}
              />
              
              <div 
                ref={el => markerRefs.current[axis.tag] = el}
                className={`absolute w-10 h-6 ${activeAxis === axis.tag ? 'bg-blue-700' : 'bg-blue-600'} rounded-full border-2 border-white z-30 transform -translate-x-1/2 hover:scale-110 transition-transform flex items-center justify-center text-white text-[0.65rem] font-medium cursor-pointer`}
                style={{ 
                  // Используем абсолютный отступ слева (20px) и процентное соотношение для основной шкалы
                  left: `calc(20px + (${percent} * (100% - 40px) / 100))`
                }}
                onMouseDown={(e) => {
                  const sliderContainer = e.currentTarget.parentElement;
                  const sliderWidth = sliderContainer.querySelector('input[type="range"]').offsetWidth;
                  handleMarkerMouseDown(e, axis, value, sliderWidth);
                }}
                onDoubleClick={() => {
                  setEditingAxis(axis.tag);
                  setEditValue(Math.round(value).toString());
                  // Используем setTimeout, чтобы дать React время отрендерить инпут перед фокусировкой
                  setTimeout(() => {
                    if (inputRefs.current[axis.tag]) {
                      inputRefs.current[axis.tag].focus();
                      inputRefs.current[axis.tag].select();
                    }
                  }, 50);
                }}
              >
                {editingAxis === axis.tag ? (
                  <input
                    ref={el => inputRefs.current[axis.tag] = el}
                    type="number"
                    min={axis.min}
                    max={axis.max}
                    step="1"
                    className="w-10 h-6 text-[0.65rem] bg-white text-blue-600 border-0 rounded-full focus:outline-none focus:ring-1 focus:ring-blue-300 px-1 text-center appearance-none no-arrows"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const newValue = parseFloat(editValue);
                        if (!isNaN(newValue) && newValue >= axis.min && newValue <= axis.max) {
                          const roundedValue = handleSliderChange(axis.tag, newValue);
                          // Обновляем отображаемое значение 
                          setEditValue(roundedValue.toString());
                        }
                        setEditingAxis(null);
                      } else if (e.key === 'Escape') {
                        setEditingAxis(null);
                      }
                    }}
                    onBlur={() => {
                      const newValue = parseFloat(editValue);
                      if (!isNaN(newValue) && newValue >= axis.min && newValue <= axis.max) {
                        handleSliderChange(axis.tag, newValue);
                      }
                      setEditingAxis(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span className="pointer-events-none select-none w-full h-full flex items-center justify-center">
                    {!isNaN(value) ? Math.round(value) : axis.default}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      
      <div className="pt-4 mt-4 border-t border-blue-100">
        <div className="mb-3">
          <label className="block text-xs font-medium text-blue-700 mb-1">
            Формат экспорта:
          </label>
          <select 
            className="w-full px-2 py-1 text-xs border border-blue-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
            value={exportFormat || 'ttf'}
            onChange={(e) => setExportFormat(e.target.value)}
          >
            <option value="ttf">TTF (TrueType Font)</option>
            <option value="otf">OTF (OpenType Font)</option>
            <option value="woff">WOFF (Web Open Font)</option>
            <option value="woff2">WOFF2 (Web Open Font 2)</option>
          </select>
        </div>
        <button 
          className="w-full py-2 text-center bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600 transition-colors shadow-sm hover:shadow"
          onClick={handleCreateStaticFont}
        >
          Generate Static Font File
        </button>
      </div>
    </div>
  );
} 