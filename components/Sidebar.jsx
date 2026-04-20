import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import VariableFontControls from './VariableFontControls';
import { hsvToRgb, rgbToHex, hexToHsv, hexToRgbComponents } from '../utils/colorUtils'; // Исправляем импорт утилит цвета
import { useSettings } from '../contexts/SettingsContext';
import { ENTIRE_PRINTABLE_ASCII_SAMPLE } from '../utils/previewSampleStrings';
import { useFontContext } from '../contexts/FontContext';
import ResetButton from './ResetButton';
import {
  SegmentedControl,
  VIEW_MODE_OPTIONS,
  ICON_RAIL_TRACK_CLASS,
  iconRailSegmentClass,
} from './ui/SegmentedControl';
import DraggableValueRangeSlider from './ui/DraggableValueRangeSlider';
import { CustomSelect } from './ui/CustomSelect';
import { EDITOR_SIDEBAR_FOOTER_BAR_CLASS } from './ui/editorChromeClasses';
import { customSelectTriggerClass } from './ui/nativeSelectFieldClasses';

const sidebarSelectClass = customSelectTriggerClass({ compact: true });

/** Быстрые образцы текста (ключи совпадают с `sampleTexts` в pages/index). */
const SAMPLE_QUICK_PRESETS = [
  { key: 'title', label: 'Заголовок' },
  { key: 'paragraph', label: 'Параграф' },
  { key: 'wikipedia', label: 'Вики' },
  { key: 'pangram', label: 'Панграмма' },
];

/** Наборы символов (ключи — `glyphSets`). */
const GLYPH_QUICK_PRESETS = [
  { key: 'macos', label: 'Mac OS' },
  { key: 'windows1252', label: 'Windows' },
  { key: 'latin_extended', label: 'Latin Ext. A' },
  { key: 'latin_supplement', label: 'Latin‑1 доп.' },
];

/** Вертикальное положение текста в превью: строки у верха / середины / низа области */
function IconVerticalTextTop(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M8 7h8M8 10h5M8 13h9" />
    </svg>
  );
}
function IconVerticalTextMiddle(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M8 11h8M8 14h5M8 17h9" />
    </svg>
  );
}
function IconVerticalTextBottom(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M8 15h8M8 18h5M8 21h9" />
    </svg>
  );
}

function IconTextAlignLeft(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="15" y2="12" />
      <line x1="3" y1="18" x2="18" y2="18" />
    </svg>
  );
}
function IconTextAlignCenter(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="5" y1="18" x2="19" y2="18" />
    </svg>
  );
}
function IconTextAlignRight(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="9" y1="12" x2="21" y2="12" />
      <line x1="6" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function IconTextAlignJustify(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <line x1="3" y1="7" x2="21" y2="7" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="17" x2="21" y2="17" />
    </svg>
  );
}
function IconTextFillExpand(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
    </svg>
  );
}

/** Опции для {@link SegmentedControl} variant="iconRail" — выравнивание и регистр */
const SIDEBAR_TEXT_ALIGN_OPTIONS = [
  { value: 'left', title: 'Выравнивание по левому краю', Icon: IconTextAlignLeft },
  { value: 'center', title: 'Выравнивание по центру строки', Icon: IconTextAlignCenter },
  { value: 'right', title: 'Выравнивание по правому краю', Icon: IconTextAlignRight },
  {
    value: 'justify',
    title: 'Растянуть текст по ширине (text-align: justify)',
    'aria-label': 'Растянуть текст по ширине',
    Icon: IconTextAlignJustify,
  },
];
const SIDEBAR_TEXT_CASE_OPTIONS = [
  {
    value: 'none',
    title: 'Обычный регистр (Аа)',
    label: 'Аа',
    labelClassName: 'text-[10px] font-semibold leading-none',
  },
  {
    value: 'uppercase',
    title: 'Верхний регистр (АА)',
    label: 'АА',
    labelClassName: 'text-[10px] font-semibold leading-none',
  },
];
const SIDEBAR_VERTICAL_ALIGN_OPTIONS = [
  { value: 'top', title: 'Текст у верхнего края превью', 'aria-label': 'Вертикально: по верху', Icon: IconVerticalTextTop },
  { value: 'middle', title: 'Текст по центру по вертикали', 'aria-label': 'Вертикально: по центру', Icon: IconVerticalTextMiddle },
  { value: 'bottom', title: 'Текст у нижнего края превью', 'aria-label': 'Вертикально: по низу', Icon: IconVerticalTextBottom },
];

const SIDEBAR_PRESET_BTN_BASE =
  'rounded-md border px-3 py-1.5 text-center text-xs uppercase font-semibold transition-colors duration-150';
const SIDEBAR_PRESET_BTN_IDLE =
  `${SIDEBAR_PRESET_BTN_BASE} h-8 border-gray-200 bg-white text-gray-800 hover:bg-black/[0.9] hover:text-white`;
/** Как активные чипы / сегменты: акцентный фон */
const SIDEBAR_PRESET_BTN_ACTIVE =
  `${SIDEBAR_PRESET_BTN_BASE} border-accent bg-accent text-white hover:bg-accent-hover`;

/** Строка: переключатель HEX/RGB + поле(я) — единая сетка */
const COLOR_VALUE_ROW = 'flex min-w-0 w-full max-w-full items-center gap-2';
const COLOR_FIELD_INPUT =
  'min-w-0 flex-1 h-8 rounded-md border border-gray-50 bg-gray-50 px-2 py-1.5 text-xs tabular-nums text-gray-900 placeholder:text-gray-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30';

/** Три поля R G B (0–255) */
function RgbTripletInputs({ hex, onChannelChange }) {
  const { r, g, b } = hexToRgbComponents(hex);
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <input
        type="number"
        min={0}
        max={255}
        step={1}
        inputMode="numeric"
        aria-label="R, 0–255"
        value={r}
        onChange={(e) => onChannelChange('r', e.target.value)}
        className={COLOR_FIELD_INPUT}
      />
      <input
        type="number"
        min={0}
        max={255}
        step={1}
        inputMode="numeric"
        aria-label="G, 0–255"
        value={g}
        onChange={(e) => onChannelChange('g', e.target.value)}
        className={COLOR_FIELD_INPUT}
      />
      <input
        type="number"
        min={0}
        max={255}
        step={1}
        inputMode="numeric"
        aria-label="B, 0–255"
        value={b}
        onChange={(e) => onChannelChange('b', e.target.value)}
        className={COLOR_FIELD_INPUT}
      />
    </div>
  );
}

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
  // Базовые ASCII символы и знаки пунктуации (совпадает с дефолтом превью)
  entire: ENTIRE_PRINTABLE_ASCII_SAMPLE,
  
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
    verticalAlignment,
    setVerticalAlignment,
    textFill, setTextFill,
    previewBackgroundImage,
    setPreviewBackgroundImage,
    viewMode,
    setViewMode,
} = useSettings();

  const { resetSelectedFontState } = useFontContext();

  /** Выбранный быстрый пресет: `sample:*` или `glyph:*` (`glyph:entire` — полный набор по умолчанию, без отдельной кнопки). */
  const [sidebarTextPreset, setSidebarTextPreset] = useState('glyph:entire');
  const [activeColorTab, setActiveColorTab] = useState('foreground'); // foreground или background
  // Рефы для цветовых полей
  const fgColorFieldRef = useRef(null);
  const bgColorFieldRef = useRef(null);
  const previewBgFileInputRef = useRef(null);
  const fgColorSliderRef = useRef(null);
  const bgColorSliderRef = useRef(null);
  
  // Координаты для кружочков в цветовых полях
  const [fgColorPos, setFgColorPos] = useState(() => {
    if (textColor && textColor.startsWith('#')) {
      const [, s, v] = hexToHsv(textColor);
      return { left: `${s}%`, top: `${100 - v}%` };
    }
    return { left: '0%', top: '100%' };
  });
  const [bgColorPos, setBgColorPos] = useState(() => {
    if (backgroundColor && backgroundColor.startsWith('#')) {
      const [, s, v] = hexToHsv(backgroundColor);
      return { left: `${s}%`, top: `${100 - v}%` };
    }
    return { left: '0%', top: '0%' };
  });
  const [fgSliderPos, setFgSliderPos] = useState(() => {
    if (textColor && textColor.startsWith('#')) {
      const [h] = hexToHsv(textColor);
      return `${h / 3.6}%`;
    }
    return '0%';
  });
  const [bgSliderPos, setBgSliderPos] = useState(() => {
    if (backgroundColor && backgroundColor.startsWith('#')) {
      const [h] = hexToHsv(backgroundColor);
      return `${h / 3.6}%`;
    }
    return '0%';
  });
  
  // Состояния для отслеживания перетаскивания
  const [isDraggingFgField, setIsDraggingFgField] = useState(false);
  const [isDraggingBgField, setIsDraggingBgField] = useState(false);
  const [isDraggingFgSlider, setIsDraggingFgSlider] = useState(false);
  const [isDraggingBgSlider, setIsDraggingBgSlider] = useState(false);
  
  // Режим отображения цвета (hex или rgb)
  const [fgColorMode, setFgColorMode] = useState('hex'); // для текста
  const [bgColorMode, setBgColorMode] = useState('hex'); // для фона
  
  const pickSidebarTextPreset = useCallback(
    (kind, itemKey) => {
      if (kind === 'sample') {
        const val = sampleTexts?.[itemKey];
        if (typeof val === 'string') {
          setSidebarTextPreset(`sample:${itemKey}`);
          setText(val);
        }
        return;
      }
      const content = glyphSets[itemKey];
      if (content) {
        setSidebarTextPreset(`glyph:${itemKey}`);
        setText(content);
      }
    },
    [sampleTexts, setText],
  );

  /** При смене шрифта — по умолчанию полный набор символов (без кнопки «Все символы» и без Google language sample). */
  useEffect(() => {
    if (!selectedFont?.id) return;
    setSidebarTextPreset('glyph:entire');
    setText(ENTIRE_PRINTABLE_ASCII_SAMPLE);
  }, [selectedFont?.id, setText]);

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

  const handleRgbChannelChange = useCallback(
    (channel, raw, isBackground) => {
      const setColor = isBackground ? setBackgroundColor : setTextColor;
      const currentHex = isBackground ? backgroundColor : textColor;
      const { r, g, b } = hexToRgbComponents(currentHex);
      const trimmed = String(raw).trim();
      const parsed = trimmed === '' ? NaN : parseInt(trimmed, 10);
      const n = Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(255, parsed));
      const next = { r, g, b, [channel]: n };
      setColor(rgbToHex(next.r, next.g, next.b));
    },
    [backgroundColor, textColor, setBackgroundColor, setTextColor]
  );

  // Функция для проверки, является ли шрифт вариативным
  const isVariableEnabled = () => {
    if (!selectedFont) return false;
    return selectedFont.isVariableFont && selectedFont.variableAxes && Object.keys(selectedFont.variableAxes).length > 0;
  };

  const sidebarPresetOptions = useMemo(
    () =>
      (availableStyles || []).map((preset) => ({
        value: preset.name,
        label: preset.name,
        style: { fontWeight: preset.weight, fontStyle: preset.style },
      })),
    [availableStyles],
  );

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

  const toggleTextFillHandler = useCallback(() => {
    setTextFill(prev => !prev);
  }, [setTextFill]);

  const handlePreviewBackgroundFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        toast.error('Выберите файл изображения');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPreviewBackgroundImage(reader.result);
        }
      };
      reader.onerror = () => toast.error('Не удалось прочитать файл');
      reader.readAsDataURL(file);
    },
    [setPreviewBackgroundImage],
  );

  const sidebarScrollRef = useRef(null);
  const sidebarScrollIdleTimerRef = useRef(null);
  const [sidebarScrollbarVisible, setSidebarScrollbarVisible] = useState(false);
  const [sidebarScrollLayout, setSidebarScrollLayout] = useState({
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0,
  });

  const syncSidebarScrollLayout = useCallback(() => {
    const el = sidebarScrollRef.current;
    if (!el) return;
    setSidebarScrollLayout({
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    });
  }, []);

  const onSidebarScroll = useCallback(() => {
    syncSidebarScrollLayout();
    setSidebarScrollbarVisible(true);
    if (sidebarScrollIdleTimerRef.current) {
      clearTimeout(sidebarScrollIdleTimerRef.current);
    }
    sidebarScrollIdleTimerRef.current = setTimeout(() => {
      setSidebarScrollbarVisible(false);
      sidebarScrollIdleTimerRef.current = null;
    }, 700);
  }, [syncSidebarScrollLayout]);

  useLayoutEffect(() => {
    syncSidebarScrollLayout();
  }, [syncSidebarScrollLayout]);

  useEffect(() => {
    const el = sidebarScrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', onSidebarScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onSidebarScroll);
      if (sidebarScrollIdleTimerRef.current) {
        clearTimeout(sidebarScrollIdleTimerRef.current);
      }
    };
  }, [onSidebarScroll]);

  useEffect(() => {
    const el = sidebarScrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => syncSidebarScrollLayout());
    ro.observe(el);
    return () => ro.disconnect();
  }, [syncSidebarScrollLayout]);

  useEffect(() => {
    const el = sidebarScrollRef.current;
    if (!el) return;
    let t;
    const mo = new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => syncSidebarScrollLayout(), 64);
    });
    mo.observe(el, { subtree: true, childList: true, attributes: true, characterData: true });
    return () => {
      clearTimeout(t);
      mo.disconnect();
    };
  }, [syncSidebarScrollLayout]);

  const sidebarOverlayThumb = useMemo(() => {
    const { scrollTop, scrollHeight, clientHeight } = sidebarScrollLayout;
    /** Совпадает с `top-2` / `bottom-2` у дорожки полосы (0.5rem ≈ 8px). */
    const trackInsetPx = 8;
    if (clientHeight < 1 || scrollHeight <= clientHeight + 1) return null;
    const trackH = clientHeight - 2 * trackInsetPx;
    if (trackH < 24) return null;
    const thumbH = Math.max(24, Math.round((clientHeight / scrollHeight) * trackH));
    const maxScroll = scrollHeight - clientHeight;
    const top = maxScroll > 0 ? (scrollTop / maxScroll) * (trackH - thumbH) : 0;
    return { thumbH, top };
  }, [sidebarScrollLayout]);

  return (
    <div className="flex h-screen min-h-0 w-64 flex-col overflow-hidden border-r border-gray-200 bg-white shadow-sm">
      <div className="flex h-12 min-h-12 shrink-0 items-center justify-left border-b border-gray-200 pl-4">
        <h1 className="text-xl font-bold text-gray-900">Dynamic font</h1>
      </div>

      <div className="relative min-h-0 flex flex-1 flex-col">
        <div
          ref={sidebarScrollRef}
          className="editor-sidebar-scroll flex min-h-0 flex-1 flex-col overflow-y-auto"
        >
      <div
        className="shrink-0 bg-white h-12 min-h-12"
        role="toolbar"
        aria-label="Режим превью"
      >
        <SegmentedControl
          value={viewMode}
          onChange={setViewMode}
          options={VIEW_MODE_OPTIONS}
          variant="grid"
          className="w-full min-w-0"
        />
      </div>
      
      {/* Базовые настройки шрифта */}
      <div className="p-4">
        <div>
          
          {selectedFont && availableStyles?.length > 0 && (
            <div className="mb-4 min-w-0">
              <CustomSelect
                id="sidebar-preset-style"
                value={selectedPresetName}
                onChange={(v) => applyPresetStyle(v)}
                options={sidebarPresetOptions}
                className={sidebarSelectClass}
                aria-label="Начертание (пресет)"
              />
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
          
          {/* Текст: выравнивание + по ширине; справа регистры Аа / АА — сегменты iconRail */}
          <div className="mb-4 flex flex-col gap-2">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <SegmentedControl
                variant="iconRail"
                value={textAlignment}
                onChange={changeTextAlignmentHandler}
                options={SIDEBAR_TEXT_ALIGN_OPTIONS}
              />
              <SegmentedControl
                variant="iconRail"
                value={textCase}
                onChange={setTextCase}
                options={SIDEBAR_TEXT_CASE_OPTIONS}
              />
            </div>
            <div className="flex min-h-8 min-w-0 items-center justify-between gap-2">
              <SegmentedControl
                variant="iconRail"
                value={verticalAlignment}
                onChange={setVerticalAlignment}
                options={SIDEBAR_VERTICAL_ALIGN_OPTIONS}
              />
              <div className={ICON_RAIL_TRACK_CLASS}>
                <button
                  type="button"
                  className={iconRailSegmentClass(textFill)}
                  title="Заполнить весь экран текстом (растянуть)"
                  aria-label="Заполнить экран текстом"
                  aria-pressed={textFill}
                  onClick={toggleTextFillHandler}
                >
                  <IconTextFillExpand className="h-4 w-4 shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Variable Axes — только у вариативного шрифта с осями */}
        {selectedFont && isVariableEnabled() && (
          <div className="-mx-4 border-t border-gray-200 px-4 pt-4 mb-4">
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
        <div className="-mx-4 border-t border-gray-200 px-4 pt-4 mb-4">
          
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
            <input
              ref={previewBgFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              aria-hidden
              onChange={handlePreviewBackgroundFileChange}
            />
            <button
              type="button"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:text-accent ${
                previewBackgroundImage ? 'bg-accent/15 text-accent' : 'bg-gray-50 text-gray-600'
              }`}
              onClick={() => {
                if (previewBackgroundImage) {
                  setPreviewBackgroundImage(null);
                } else {
                  previewBgFileInputRef.current?.click();
                }
              }}
              title={
                previewBackgroundImage
                  ? 'Убрать фоновое изображение с превью'
                  : 'Фон области превью — выбрать изображение'
              }
              aria-label={
                previewBackgroundImage
                  ? 'Убрать фоновое изображение с превью'
                  : 'Фон области превью — выбрать изображение'
              }
              aria-pressed={Boolean(previewBackgroundImage)}
            >
              {previewBackgroundImage ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-13.5-1.409-1.409a2.25 2.25 0 0 0-3.182 0l-2.121 2.121m11.743 11.743-2.121-2.121a2.25 2.25 0 0 0-3.182 0l-2.121 2.121m4.242 4.242-8.486-8.486" />
                </svg>
              )}
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
              
              <div className={COLOR_VALUE_ROW}>
                <div className="flex shrink-0 items-center">
                  <button 
                    type="button"
                    className="flex items-center h-8 rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
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
                    spellCheck={false}
                    aria-label="Цвет текста, HEX"
                    className={COLOR_FIELD_INPUT}
                  />
                ) : (
                  <RgbTripletInputs
                    hex={textColor}
                    onChannelChange={(ch, val) => handleRgbChannelChange(ch, val, false)}
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
              
              <div className={COLOR_VALUE_ROW}>
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
                    spellCheck={false}
                    aria-label="Цвет фона, HEX"
                    className={COLOR_FIELD_INPUT}
                  />
                ) : (
                  <RgbTripletInputs
                    hex={backgroundColor}
                    onChannelChange={(ch, val) => handleRgbChannelChange(ch, val, true)}
                  />
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Быстрые образцы текста и наборы символов — одна сетка */}
        <div className="-mx-4 border-t border-gray-200 px-4 pt-4 pb-4">
          <div className="mb-4 grid grid-cols-2 gap-2">
            {SAMPLE_QUICK_PRESETS.map(({ key, label }) => {
              const active = sidebarTextPreset === `sample:${key}`;
              return (
                <button
                  key={`sample-${key}`}
                  type="button"
                  className={active ? SIDEBAR_PRESET_BTN_ACTIVE : SIDEBAR_PRESET_BTN_IDLE}
                  onClick={() => pickSidebarTextPreset('sample', key)}
                >
                  {label}
                </button>
              );
            })}
            {GLYPH_QUICK_PRESETS.map(({ key, label }) => {
              const active = sidebarTextPreset === `glyph:${key}`;
              return (
                <button
                  key={`glyph-${key}`}
                  type="button"
                  className={active ? SIDEBAR_PRESET_BTN_ACTIVE : SIDEBAR_PRESET_BTN_IDLE}
                  onClick={() => pickSidebarTextPreset('glyph', key)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={EDITOR_SIDEBAR_FOOTER_BAR_CLASS}>
        <ResetButton onResetSelectedFont={resetSelectedFontState} />
      </div>
        </div>

        {sidebarOverlayThumb ? (
          <div
            className="pointer-events-none absolute right-0 top-2 bottom-2 z-20 w-2"
            aria-hidden
          >
            <div
              className={`absolute right-1 w-1.5 rounded-full bg-gray-400 transition-opacity duration-200 ${
                sidebarScrollbarVisible ? 'opacity-90' : 'opacity-0'
              }`}
              style={{
                top: `${sidebarOverlayThumb.top}px`,
                height: `${sidebarOverlayThumb.thumbH}px`,
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
