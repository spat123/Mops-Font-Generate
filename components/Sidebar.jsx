import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import VariableFontControls from './VariableFontControls';
import { 
  hsvToRgb, 
  rgbToHex, 
  hexToHsv, 
  hexToRgbString, 
  rgbStringToHex 
} from '../utils/colorUtils'; // Исправляем импорт утилит цвета
import { useSettings, DEFAULT_PREVIEW_TEXT } from '../contexts/SettingsContext';
import ResetButton from './ResetButton';
import { SegmentedControl } from './ui/SegmentedControl';
import { SelectableChip } from './ui/SelectableChip';
import { SampleTextPresetGrid } from './ui/SampleTextPresets';
import DraggableValueRangeSlider from './ui/DraggableValueRangeSlider';
import { NativeSelect } from './ui/NativeSelect';
import { EDITOR_SIDEBAR_FOOTER_BAR_CLASS } from './ui/editorChromeClasses';
import { nativeSelectFieldClass } from './ui/nativeSelectFieldClasses';

const sidebarSelectClass = nativeSelectFieldClass();

const SAMPLE_GLYPH_PANEL_TABS = [
  { value: 'sample', label: 'Sample Text' },
  { value: 'glyphs', label: 'Glyph Sets' },
];

/** Иконки для слайдеров (подписи — в title у контейнера) */
function SliderIconFontSize(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M12 5v11" />
      <path d="M8 5h8" />
      <path d="M7 18h10" />
    </svg>
  );
}

function SliderIconLetterSpacing(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M5 7v10M19 7v10" />
      <path d="M10 12h4" />
      <path d="M10 12L8.5 10.5M10 12L8.5 13.5" />
      <path d="M14 12l1.5-1.5M14 12l1.5 1.5" />
    </svg>
  );
}

function SliderIconLineHeight(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M9 7h10M9 12h10M9 17h10" />
      <path d="M4 9v6" />
      <path d="M2.5 10.5L4 9l1.5 1.5" />
      <path d="M2.5 13.5L4 15l1.5-1.5" />
    </svg>
  );
}

// Определяем константу glyphSets с правильными наборами символов
const glyphSets = {
  // Базовые ASCII символы и знаки пунктуации
  entire: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
  
  // MacOS Roman (основные символы)
  macos: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-={}[]|\\:;"\'<>,.?/',
  
  // Basic Latin (базовые латинские символы)
  basic: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  
  // Latin Extended-A (основные акцентированные символы)
  latin_extended: 'ĀāĂăĄąĆćĈĉĊċČčĎďĐđĒēĔĕĖėĘęĚěĜĝĞğĠġĢģĤĥĦħĨĩĪīĬĭĮįİıĲĳĴĵĶķĸĹĺĻļĽľĿ',
  
  // Краткий обзор
  overview: 'ABCabc123',
  
  // Windows 1252 (основные европейские символы)
  windows1252: 'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»¦¯´±‗¾¶§÷¸°¨·¹³²■',
  
  // Latin-1 Supplement (основные символы)
  latin_supplement: '¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ'
};

export default function Sidebar({
  selectedFont,
  setSelectedFont,
  isAnimating,
  toggleAnimation,
  animationSpeed,
  setAnimationSpeed,
  sampleTexts,
  availableStyles,
  selectedPresetName,
  applyPresetStyle,
  getVariableAxes,
  handleVariableSettingsChange,
  variableSettings,
  resetVariableSettings,
}) {
  // Получаем настройки из контекста
  const { 
    text, setText, 
    fontSize, setFontSize, 
    lineHeight, setLineHeight, 
    letterSpacing, setLetterSpacing, 
    textColor, setTextColor, 
    backgroundColor, setBackgroundColor, 
    textDirection, setTextDirection, 
    textAlignment, setTextAlignment, 
    textCase, setTextCase, 
    textCenter, setTextCenter, 
    textFill, setTextFill 
  } = useSettings();
  
  const [activeTab, setActiveTab] = useState('sample'); // 'sample' или 'glyphs'
  const [activeGlyphSet, setActiveGlyphSet] = useState('entire'); // текущий набор глифов
  /** Последний авто-подставленный googleFontRecommendedSample (чтобы сбросить при смене на шрифт без образца). */
  const prevGoogleAutoSampleRef = useRef('');
  const [activeColorTab, setActiveColorTab] = useState('foreground'); // foreground или background
  // Рефы для цветовых полей
  const fgColorFieldRef = useRef(null);
  const bgColorFieldRef = useRef(null);
  const fgColorSliderRef = useRef(null);
  const bgColorSliderRef = useRef(null);
  
  // Координаты для кружочков в цветовых полях
  const [fgColorPos, setFgColorPos] = useState({ left: '100%', top: '0%' });
  const [bgColorPos, setBgColorPos] = useState({ left: '0%', top: '100%' });
  const [fgSliderPos, setFgSliderPos] = useState('0%');
  const [bgSliderPos, setBgSliderPos] = useState('0%');
  
  // Состояния для отслеживания перетаскивания
  const [isDraggingFgField, setIsDraggingFgField] = useState(false);
  const [isDraggingBgField, setIsDraggingBgField] = useState(false);
  const [isDraggingFgSlider, setIsDraggingFgSlider] = useState(false);
  const [isDraggingBgSlider, setIsDraggingBgSlider] = useState(false);
  
  // Режим отображения цвета (hex или rgb)
  const [fgColorMode, setFgColorMode] = useState('hex'); // для текста
  const [bgColorMode, setBgColorMode] = useState('hex'); // для фона
  
  const glyphSetsMerged = useMemo(() => {
    const g = { ...glyphSets };
    const sample = selectedFont?.googleFontRecommendedSample?.trim();
    if (sample) {
      g.google_script = sample;
    }
    return g;
  }, [selectedFont?.id, selectedFont?.googleFontRecommendedSample]);

  // Обработчик выбора набора глифов
  const handleGlyphSetChange = useCallback(
    (setKey) => {
      setActiveGlyphSet(setKey);
      const content = glyphSetsMerged[setKey];
      if (content) setText(content);
    },
    [glyphSetsMerged, setText],
  );

  // Google-образец при выборе шрифта; при смене на шрифт без образца убираем «хвост» чужого языка, если текст не трогали.
  useEffect(() => {
    const sample = selectedFont?.googleFontRecommendedSample?.trim();
    if (sample) {
      prevGoogleAutoSampleRef.current = sample;
      setActiveGlyphSet('google_script');
      setText(sample);
      return;
    }
    setActiveGlyphSet('entire');
    setText((prev) => {
      const last = prevGoogleAutoSampleRef.current;
      if (last && prev === last) return DEFAULT_PREVIEW_TEXT;
      return prev;
    });
    prevGoogleAutoSampleRef.current = '';
  }, [selectedFont?.id, selectedFont?.googleFontRecommendedSample, setText]);

  // Получаем название пресета из веса и стиля
  // Удаляем локальную функцию
  /* 
  const getPresetNameFromWeightAndStyle = (weight, style) => {
    const preset = presetStyles.find(p => p.weight === weight && p.style === style);
    return preset ? preset.name : 'Regular';
  };
  */
  
  // Получение цвета HSL для градиента поля выбора оттенка
  const getHueColor = (hue) => {
    return `hsl(${hue}, 100%, 50%)`;
  };

  // Обновляем положение маркеров при монтировании компонента
  useEffect(() => {
    if (textColor && textColor.startsWith('#')) {
      const [h, s, v] = hexToHsv(textColor);
      const leftPos = `${s}%`;
      const topPos = `${100 - v}%`;
      setFgColorPos({ left: leftPos, top: topPos });
      setFgSliderPos(`${h / 3.6}%`);
    }
    
    if (backgroundColor && backgroundColor.startsWith('#')) {
      const [h, s, v] = hexToHsv(backgroundColor);
      const leftPos = `${s}%`;
      const topPos = `${100 - v}%`;
      setBgColorPos({ left: leftPos, top: topPos });
      setBgSliderPos(`${h / 3.6}%`);
    }
  }, [textColor, backgroundColor]);

  // Обновляем положение маркеров при изменении активной вкладки или цветов
  useEffect(() => {
    // Если активна вкладка фона, обновляем позицию маркера фона
    if (activeColorTab === 'background' && backgroundColor && backgroundColor.startsWith('#')) {
      const [h, s, v] = hexToHsv(backgroundColor);
      // Убедимся, что устанавливаем корректное значение с символом % для CSS
      const leftPos = `${s}%`;
      const topPos = `${100 - v}%`;
      setBgColorPos({ left: leftPos, top: topPos });
      setBgSliderPos(`${h / 3.6}%`);
    }
    
    // Если активна вкладка текста, обновляем позицию маркера текста
    if (activeColorTab === 'foreground' && textColor && textColor.startsWith('#')) {
      const [h, s, v] = hexToHsv(textColor);
      const leftPos = `${s}%`;
      const topPos = `${100 - v}%`;
      setFgColorPos({ left: leftPos, top: topPos });
      setFgSliderPos(`${h / 3.6}%`);
    }
  }, [activeColorTab, backgroundColor, textColor]);

  // Создание цвета из HSV компонентов
  const createColorFromHSV = (h, s, v) => {
    const rgb = hsvToRgb(h, s, v);
    return rgbToHex(rgb[0], rgb[1], rgb[2]);
  };

  // Обработчик для поля выбора цвета
  const handleColorFieldClick = (e, isBackground) => {
    const field = isBackground ? bgColorFieldRef.current : fgColorFieldRef.current;
    if (!field) return;
    
    // Получаем координаты внутреннего контейнера
    const innerField = field.querySelector('.absolute.inset-0.p-3 > div');
    const rect = innerField.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Позиция в процентах
    const xPercent = Math.min(100, Math.max(0, (x / rect.width) * 100));
    const yPercent = Math.min(100, Math.max(0, (y / rect.height) * 100));
    
    // Обновляем позицию маркера
    if (isBackground) {
      setBgColorPos({ left: `${xPercent}%`, top: `${yPercent}%` });
      
      // Получаем текущий оттенок из позиции слайдера
      const hue = parseFloat(bgSliderPos) * 3.6; // 0-360
      // Получаем насыщенность и яркость из позиции маркера
      const saturation = xPercent / 100;
      const value = 1 - (yPercent / 100);
      
      // Создаем цвет
      const newColor = createColorFromHSV(hue, saturation, value);
      setBackgroundColor(newColor);
    } else {
      setFgColorPos({ left: `${xPercent}%`, top: `${yPercent}%` });
      
      // Получаем текущий оттенок из позиции слайдера
      const hue = parseFloat(fgSliderPos) * 3.6; // 0-360
      // Получаем насыщенность и яркость из позиции маркера
      const saturation = xPercent / 100;
      const value = 1 - (yPercent / 100);
      
      // Создаем цвет
      const newColor = createColorFromHSV(hue, saturation, value);
      setTextColor(newColor);
    }
  };
  
  // Обработчик для слайдера выбора оттенка
  const handleColorSliderClick = (e, isBackground) => {
    const slider = isBackground ? bgColorSliderRef.current : fgColorSliderRef.current;
    if (!slider) return;
    
    // Получаем координаты внутреннего контейнера с градиентом
    const innerSlider = slider.querySelector('.absolute.inset-0.px-3 > div');
    const rect = innerSlider.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // Получаем ширину внутреннего слайдера
    const sliderWidth = rect.width;
    
    // Ограничиваем позицию в пределах слайдера
    const percentage = Math.min(100, Math.max(0, (x / sliderWidth) * 100));
    
    if (isBackground) {
      setBgSliderPos(`${percentage}%`);
      
      // Получаем текущую позицию маркера
      const saturation = parseFloat(bgColorPos.left) / 100;
      const value = 1 - (parseFloat(bgColorPos.top) / 100);
      
      // Новый оттенок (H) из позиции слайдера
      const hue = percentage * 3.6; // 0-360
      
      // Создаем цвет, сохраняя S и V
      const newColor = createColorFromHSV(hue, saturation, value);
      setBackgroundColor(newColor);
    } else {
      setFgSliderPos(`${percentage}%`);
      
      // Получаем текущую позицию маркера
      const saturation = parseFloat(fgColorPos.left) / 100;
      const value = 1 - (parseFloat(fgColorPos.top) / 100);
      
      // Новый оттенок (H) из позиции слайдера
      const hue = percentage * 3.6; // 0-360
      
      // Создаем цвет, сохраняя S и V
      const newColor = createColorFromHSV(hue, saturation, value);
      setTextColor(newColor);
    }
  };

  // Отслеживаем события мыши для перетаскивания
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingFgField) {
        e.preventDefault();
        handleColorFieldClick(e, false);
      } else if (isDraggingBgField) {
        e.preventDefault();
        handleColorFieldClick(e, true);
      } else if (isDraggingFgSlider) {
        e.preventDefault();
        handleColorSliderClick(e, false);
      } else if (isDraggingBgSlider) {
        e.preventDefault();
        handleColorSliderClick(e, true);
      }
    };
    
    const handleMouseUp = () => {
      setIsDraggingFgField(false);
      setIsDraggingBgField(false);
      setIsDraggingFgSlider(false);
      setIsDraggingBgSlider(false);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingFgField, isDraggingBgField, isDraggingFgSlider, isDraggingBgSlider]);

  // Обработка изменения RGB значения
  const handleRgbChange = (e, isBackground) => {
    const rgbValue = e.target.value;
    if (rgbValue.startsWith('rgb')) {
      const hexValue = rgbStringToHex(rgbValue);
      if (isBackground) {
        setBackgroundColor(hexValue);
      } else {
        setTextColor(hexValue);
      }
    }
  };

  // Функция для проверки, является ли шрифт вариативным
  const isVariableEnabled = () => {
    if (!selectedFont) return false;
    return selectedFont.isVariableFont && selectedFont.variableAxes && Object.keys(selectedFont.variableAxes).length > 0;
  };

  // Обработчик двойного клика по шрифту для открытия редактора стилей
  const handleFontDoubleClick = () => {
    if (selectedFont && selectedFont.isVariableFont && selectedFont.variableAxes) {
      // Активируем режим вариативного шрифта
      setVariationSettingsOpen(true);
    }
  };

  // Обработчики для управления текстом (используют сеттеры из useSettings)
  const changeTextAlignmentHandler = useCallback((alignment) => {
    setTextAlignment(alignment);
  }, [setTextAlignment]);

  const toggleTextCaseHandler = useCallback(() => {
    setTextCase(prev => prev === 'uppercase' ? 'none' : 'uppercase');
  }, [setTextCase]);

  const toggleTextCenterHandler = useCallback(() => {
    setTextCenter(prev => !prev);
  }, [setTextCenter]);

  const toggleTextFillHandler = useCallback(() => {
    setTextFill(prev => !prev);
  }, [setTextFill]);
  
  return (
    <div className="w-64 flex flex-col border-r border-gray-200 bg-white shadow-sm h-screen overflow-y-auto">
      <div className="h-12 min-h-12 flex items-center justify-left pl-4">
        <h1 className="text-xl font-bold text-gray-900">Dynamic font</h1>
      </div>
      
      {/* Базовые настройки шрифта */}
      <div className="p-4 border-t border-gray-200">
        <div>
          
          {selectedFont && availableStyles?.length > 0 && (
            <div className="mb-4 min-w-0">
              <NativeSelect
                id="sidebar-preset-style"
                value={selectedPresetName}
                onChange={(e) => applyPresetStyle(e.target.value)}
                className={sidebarSelectClass}
                aria-label="Начертание (пресет)"
              >
                {availableStyles.map((preset, index) => (
                  <option
                    key={index}
                    value={preset.name}
                    style={{ fontWeight: preset.weight, fontStyle: preset.style }}
                  >
                    {preset.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
          
          <div
            className="mb-3 flex items-center gap-2"
            title="Размер шрифта (TT)"
            role="group"
            aria-label="Размер шрифта (TT)"
          >
            <span className="flex h-8 w-5 shrink-0 items-center justify-center text-gray-600">
              <SliderIconFontSize />
            </span>
            <div className="min-w-0 flex-1">
              <DraggableValueRangeSlider
                min={12}
                max={300}
                step={1}
                value={fontSize}
                onChange={setFontSize}
                formatDisplay={(v) => String(Math.round(v))}
              />
            </div>
          </div>

          <div
            className="mb-3 flex items-center gap-2"
            title="Межбуквенный интервал"
            role="group"
            aria-label="Межбуквенный интервал"
          >
            <span className="flex h-8 w-5 shrink-0 items-center justify-center text-gray-600">
              <SliderIconLetterSpacing />
            </span>
            <div className="min-w-0 flex-1">
              <DraggableValueRangeSlider
                min={-100}
                max={100}
                step={1}
                value={letterSpacing}
                onChange={setLetterSpacing}
                formatDisplay={(v) => String(Math.round(v))}
              />
            </div>
          </div>

          <div
            className="mb-3 flex items-center gap-2"
            title="Межстрочный интервал (TT)"
            role="group"
            aria-label="Межстрочный интервал (TT)"
          >
            <span className="flex h-8 w-5 shrink-0 items-center justify-center text-gray-600">
              <SliderIconLineHeight />
            </span>
            <div className="min-w-0 flex-1">
              <DraggableValueRangeSlider
                min={0.5}
                max={3}
                step={0.05}
                value={lineHeight}
                onChange={setLineHeight}
                formatDisplay={(v) => Number(v).toFixed(2)}
              />
            </div>
          </div>
          
          {/* Текст: выравнивание + по ширине в одном блоке, регистры справа; снизу слева — окно превью */}
          <div className="mb-4 flex flex-col gap-2">
            <div className="flex min-w-0 items-stretch gap-2">
              <div className="flex min-h-9 min-w-0 flex-1 overflow-hidden rounded-md bg-gray-50">
                <button
                  type="button"
                  className={`flex min-h-9 min-w-0 flex-1 items-center justify-center p-2 text-xs transition-colors hover:bg-black/[0.06] ${
                    textAlignment === 'left' ? 'text-accent' : 'text-gray-700'
                  }`}
                  title="Выравнивание по левому краю"
                  onClick={() => changeTextAlignmentHandler('left')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="15" y2="12" />
                    <line x1="3" y1="18" x2="18" y2="18" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`flex min-h-9 min-w-0 flex-1 items-center justify-center p-2 text-xs transition-colors hover:bg-black/[0.06] ${
                    textAlignment === 'center' ? 'text-accent' : 'text-gray-700'
                  }`}
                  title="Выравнивание по центру строки"
                  onClick={() => changeTextAlignmentHandler('center')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                    <line x1="5" y1="18" x2="19" y2="18" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`flex min-h-9 min-w-0 flex-1 items-center justify-center p-2 text-xs transition-colors hover:bg-black/[0.06] ${
                    textAlignment === 'right' ? 'text-accent' : 'text-gray-700'
                  }`}
                  title="Выравнивание по правому краю"
                  onClick={() => changeTextAlignmentHandler('right')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="9" y1="12" x2="21" y2="12" />
                    <line x1="6" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`flex min-h-9 min-w-0 flex-1 items-center justify-center p-2 text-xs transition-colors hover:bg-black/[0.06] ${
                    textAlignment === 'justify' ? 'text-accent' : 'text-gray-700'
                  }`}
                  title="Растянуть текст по ширине (text-align: justify)"
                  aria-label="Растянуть текст по ширине"
                  onClick={() => changeTextAlignmentHandler('justify')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <line x1="3" y1="7" x2="21" y2="7" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="17" x2="21" y2="17" />
                  </svg>
                </button>
              </div>
              <div className="flex min-h-9 shrink-0 overflow-hidden rounded-md bg-gray-50">
                <button
                  type="button"
                  className={`flex min-h-9 min-w-[2.25rem] items-center justify-center px-2 text-xs font-medium transition-colors hover:bg-black/[0.06] ${
                    textCase === 'uppercase' ? 'text-accent' : 'text-gray-700'
                  }`}
                  title="Верхний регистр (АА)"
                  onClick={toggleTextCaseHandler}
                >
                  АА
                </button>
                <button
                  type="button"
                  className={`flex min-h-9 min-w-[2.25rem] items-center justify-center px-2 text-xs font-medium transition-colors hover:bg-black/[0.06] ${
                    textCase === 'none' ? 'text-accent' : 'text-gray-700'
                  }`}
                  title="Обычный регистр (Аа)"
                  onClick={toggleTextCaseHandler}
                >
                  Аа
                </button>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="flex min-h-9 shrink-0 overflow-hidden rounded-md bg-gray-50">
                <button
                  type="button"
                  className={`flex min-h-9 w-10 items-center justify-center p-2 transition-colors hover:bg-black/[0.06] ${
                    textCenter ? 'bg-accent-soft text-accent' : 'text-gray-700'
                  }`}
                  title="Выровнять блок текста по центру окна превью"
                  aria-label="Центрировать текст в окне превью"
                  onClick={toggleTextCenterHandler}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <path d="M12 8v8M8 12h8" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`flex min-h-9 w-10 items-center justify-center p-2 transition-colors hover:bg-black/[0.06] ${
                    textFill ? 'bg-accent-soft text-accent' : 'text-gray-700'
                  }`}
                  title="Заполнить весь экран текстом"
                  aria-label="Заполнить экран текстом"
                  onClick={toggleTextFillHandler}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Variable Axes — заголовок только у вариативного шрифта с осями */}
        {selectedFont && (
          <div className="border-t border-gray-200 pt-4 mb-4">
            {isVariableEnabled() ? (
              <h2 className="font-medium text-sm text-gray-900 mb-2">Variable Axes</h2>
            ) : null}
            <VariableFontControls 
              font={selectedFont} 
              onSettingsChange={handleVariableSettingsChange}
              isAnimating={isAnimating}
              toggleAnimation={toggleAnimation}
              animationSpeed={animationSpeed}
              setAnimationSpeed={setAnimationSpeed}
            />
          </div>
        )}
        
        {/* Секция настроек цвета */}
        <div className="border-t border-gray-200 pt-4 mb-4">
          
          <div className="mb-3 flex min-w-0 items-center gap-2">
            <SegmentedControl
              variant="surface"
              className="min-w-0 flex-1"
              value={activeColorTab}
              onChange={setActiveColorTab}
              options={[
                { value: 'foreground', label: 'Текст' },
                { value: 'background', label: 'Фон' },
              ]}
            />
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-600 transition-colors hover:text-accent"
              onClick={() => {
                const tempColor = textColor;
                const tempPos = fgColorPos;
                const tempSliderPos = fgSliderPos;

                setTextColor(backgroundColor);
                setFgColorPos(bgColorPos);
                setFgSliderPos(bgSliderPos);

                setBackgroundColor(tempColor);
                setBgColorPos(tempPos);
                setBgSliderPos(tempSliderPos);
              }}
              title="Поменять цвета текста и фона местами"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>
          
          {activeColorTab === 'foreground' ? (
            <div>
              <div 
                ref={fgColorFieldRef}
                className="rounded-xl h-24 mb-3 relative cursor-pointer"
                onClick={(e) => handleColorFieldClick(e, false)}
                onMouseDown={(e) => {
                  handleColorFieldClick(e, false);
                  setIsDraggingFgField(true);
                }}
                style={{
                  background: `linear-gradient(to right, white, ${getHueColor(parseFloat(fgSliderPos) * 3.6)}), linear-gradient(to bottom, transparent, black)`,
                  backgroundBlendMode: 'multiply'
                }}
              >
                <div className="absolute inset-0 p-3">
                  <div 
                    className="w-full h-full rounded-md relative"
                    style={{
                      
                    }}
                  >
                    <div 
                      className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2"
                      style={{ 
                        backgroundColor: textColor,
                        left: fgColorPos.left, 
                        top: fgColorPos.top 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div 
                ref={fgColorSliderRef}
                className="h-6 rounded-xl mb-3 relative cursor-pointer"
                onClick={(e) => handleColorSliderClick(e, false)}
                onMouseDown={(e) => {
                  handleColorSliderClick(e, false);
                  setIsDraggingFgSlider(true);
                }}
                style={{
                  background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                  boxSizing: 'border-box',
                  padding: '0'
                }}
              >
                <div className="absolute inset-0 px-3">
                  <div 
                    className="w-full h-full rounded-md relative"
                    style={{
                    }}
                  >
                    <div 
                      className="absolute w-4 h-4 rounded-full shadow-md top-1/2" 
                      style={{
                        left: fgSliderPos,
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: getHueColor(parseFloat(fgSliderPos) * 3.6),
                        border: '2px solid white'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="flex min-w-0 w-full max-w-full items-center gap-2">
                <div className="flex shrink-0 items-center">
                  <button 
                    type="button"
                    className="flex items-center rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
                    onClick={() => setFgColorMode(fgColorMode === 'hex' ? 'rgb' : 'hex')}
                    title="Переключить между HEX и RGB форматами цвета"
                  >
                    {fgColorMode.toUpperCase()}
                    <div className="flex flex-col ml-1 -space-y-1">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-2.5 h-2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-2.5 h-2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </div>
                  </button>
                </div>
                {fgColorMode === 'hex' ? (
                  <input
                    type="text"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="min-w-0 w-0 flex-1 border border-gray-200 rounded-md px-2 py-1 text-xs"
                  />
                ) : (
                  <input
                    type="text"
                    value={hexToRgbString(textColor)}
                    onChange={(e) => handleRgbChange(e, false)}
                    className="min-w-0 w-0 flex-1 border border-gray-200 rounded-md px-2 py-1 text-xs"
                  />
                )}
              </div>
            </div>
          ) : (
            <div>
              <div 
                ref={bgColorFieldRef}
                className="rounded-xl h-24 mb-3 relative cursor-pointer"
                onClick={(e) => handleColorFieldClick(e, true)}
                onMouseDown={(e) => {
                  handleColorFieldClick(e, true);
                  setIsDraggingBgField(true);
                }}
                style={{
                  background: `linear-gradient(to right, white, ${getHueColor(parseFloat(bgSliderPos) * 3.6)}), linear-gradient(to bottom, transparent, black)`,
                  backgroundBlendMode: 'multiply'
                }}
              >
                <div className="absolute inset-0 p-3">
                  <div 
                    className="w-full h-full rounded-md relative"
                    style={{
                    
                    }}
                  >
                    <div 
                      className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2"
                      style={{ 
                        backgroundColor: backgroundColor,
                        left: bgColorPos.left, 
                        top: bgColorPos.top 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div 
                ref={bgColorSliderRef}
                className="h-6 rounded-xl mb-3 relative cursor-pointer"
                onClick={(e) => handleColorSliderClick(e, true)}
                onMouseDown={(e) => {
                  handleColorSliderClick(e, true);
                  setIsDraggingBgSlider(true);
                }}
                style={{
                  background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                  boxSizing: 'border-box',
                  padding: '0'
                }}
              >
                <div className="absolute inset-0 px-3">
                  <div 
                    className="w-full h-full rounded-md relative"
                    style={{ 
                    }}
                  >
                    <div 
                      className="absolute w-4 h-4 rounded-full shadow-md top-1/2" 
                      style={{
                        left: bgSliderPos,
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: getHueColor(parseFloat(bgSliderPos) * 3.6),
                        border: '2px solid white'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="flex min-w-0 w-full max-w-full items-center gap-2">
                <div className="flex shrink-0 items-center">
                  <button 
                    type="button"
                    className="flex items-center rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
                    onClick={() => setBgColorMode(bgColorMode === 'hex' ? 'rgb' : 'hex')}
                    title="Переключить между HEX и RGB форматами цвета"
                  >
                    {bgColorMode.toUpperCase()}
                    <div className="flex flex-col ml-1 -space-y-1">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-2.5 h-2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-2.5 h-2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </div>
                  </button>
                </div>
                {bgColorMode === 'hex' ? (
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="min-w-0 w-0 flex-1 border border-gray-200 rounded-md px-2 py-1 text-xs"
                  />
                ) : (
                  <input
                    type="text"
                    value={hexToRgbString(backgroundColor)}
                    onChange={(e) => handleRgbChange(e, true)}
                    className="min-w-0 w-0 flex-1 border border-gray-200 rounded-md px-2 py-1 text-xs"
                  />
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Нижняя панель с табами Sample Text / Glyph Sets */}
        <div className="border-t border-gray-200 pt-4 pb-4">
          <div className="mb-3">
            <SegmentedControl
              variant="surface"
              className="w-full"
              value={activeTab}
              onChange={setActiveTab}
              options={SAMPLE_GLYPH_PANEL_TABS}
            />
          </div>
          
          {activeTab === 'sample' ? (
            <SampleTextPresetGrid sampleTexts={sampleTexts} onSelect={setText} />
          ) : (
            <div className="mb-4">
              <div className="mb-2 grid grid-cols-2 gap-2">
                <SelectableChip
                  active={activeGlyphSet === 'entire'}
                  onClick={() => handleGlyphSetChange('entire')}
                >
                  Entire Font
                </SelectableChip>
                <SelectableChip
                  active={activeGlyphSet === 'macos'}
                  onClick={() => handleGlyphSetChange('macos')}
                >
                  MacOS Roman
                </SelectableChip>
                <SelectableChip
                  active={activeGlyphSet === 'basic'}
                  onClick={() => handleGlyphSetChange('basic')}
                >
                  Basic Latin
                </SelectableChip>
                <SelectableChip
                  active={activeGlyphSet === 'latin_extended'}
                  onClick={() => handleGlyphSetChange('latin_extended')}
                >
                  Latin Extended-A
                </SelectableChip>
                <SelectableChip
                  active={activeGlyphSet === 'overview'}
                  onClick={() => handleGlyphSetChange('overview')}
                >
                  Overview
                </SelectableChip>
                <SelectableChip
                  active={activeGlyphSet === 'windows1252'}
                  onClick={() => handleGlyphSetChange('windows1252')}
                >
                  Windows 1252
                </SelectableChip>
                <SelectableChip
                  active={activeGlyphSet === 'latin_supplement'}
                  onClick={() => handleGlyphSetChange('latin_supplement')}
                >
                  Latin Supplement
                </SelectableChip>
                {glyphSetsMerged.google_script ? (
                  <SelectableChip
                    className="col-span-2"
                    active={activeGlyphSet === 'google_script'}
                    onClick={() => handleGlyphSetChange('google_script')}
                  >
                    Образец языка (Google)
                  </SelectableChip>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={EDITOR_SIDEBAR_FOOTER_BAR_CLASS}>
        <ResetButton />
      </div>

    </div>
  );
}
