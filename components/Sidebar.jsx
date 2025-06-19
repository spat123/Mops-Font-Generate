import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import FontUploader from './FontUploader';
import VariableFontControls from './VariableFontControls';
// import { processGoogleFont, fetchGoogleFontsData } from '../utils/googleFontService'; // Удален ранее
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  hsvToRgb, 
  rgbToHex, 
  hexToHsv, 
  hexToRgbString, 
  rgbStringToHex 
} from '../utils/colorUtils'; // Исправляем импорт утилит цвета
import { useFontManager } from '../hooks/useFontManager';
import { useSettings } from '../contexts/SettingsContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolderOpen, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import ResetButton from './ResetButton';

// Заменяем список Google Fonts на список доступных Fontsource
const FONTSOURCE_FONTS = [
  "Roboto", "Montserrat" // Добавлять сюда по мере установки пакетов
];

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
  handleFontsUploaded,
  removeFontProp,
  isAnimating,
  toggleAnimation,
  animationSpeed,
  setAnimationSpeed,
  sampleTexts,
  availableStyles,
  selectedPresetName,
  applyPresetStyle,
  selectOrAddFontsourceFont,
  getVariableAxes,
  handleVariableSettingsChange,
  variableSettings,
  resetVariableSettings,
}) {
  // Используем removeFontProp для инициализации локальной removeFont
  const removeFont = removeFontProp;
  
  // Получаем настройки из контекста
  const { 
    text, setText, 
    fontSize, setFontSize, 
    lineHeight, setLineHeight, 
    letterSpacing, setLetterSpacing, 
    textColor, setTextColor, 
    backgroundColor, setBackgroundColor, 
    viewMode, setViewMode, 
    textDirection, setTextDirection, 
    textAlignment, setTextAlignment, 
    textCase, setTextCase, 
    textCenter, setTextCenter, 
    textFill, setTextFill 
  } = useSettings();
  
  const [activeTab, setActiveTab] = useState('sample'); // 'sample' или 'glyphs'
  const [activeGlyphSet, setActiveGlyphSet] = useState('entire'); // текущий набор глифов
  const [activeColorTab, setActiveColorTab] = useState('foreground'); // foreground или background
  const [searchTerm, setSearchTerm] = useState('');
  const [fontsList, setFontsList] = useState(FONTSOURCE_FONTS);
  
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
  
  // Удаляем состояние для отслеживания выбранного пресета стиля
  // const [selectedPresetStyle, setSelectedPresetStyle] = useState('Regular');
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  
  
  
  // Дополняем список шрифтов вариативными версиями
  useEffect(() => {
    // Для каждого шрифта добавляем его вариативную версию со словом "Variable"
    const fontsWithVariants = [...FONTSOURCE_FONTS];
    
    // Добавляем вариативные версии для известных шрифтов
    FONTSOURCE_FONTS.forEach(font => {
      // Добавляем только для популярных шрифтов, которые вероятно имеют вариативные версии
      if (['Montserrat', 'Roboto', 'Inter', 'Open Sans', 'Source Sans Pro', 
           'Nunito', 'Raleway', 'Work Sans', 'Rubik', 'Archivo'].includes(font)) {
        fontsWithVariants.push(`${font} Variable`);
      }
    });
    
    setFontsList(fontsWithVariants);
  }, []);
  
  // Отфильтрованные шрифты по поисковому запросу
  const filteredFonts = fontsList.filter(font => 
    font.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Функция для выбора шрифта, которая проверяет, является ли это вариативной версией
  const handleFontSelection = (fontFamilyName) => {
    // Проверяем, является ли выбранный шрифт вариативной версией
    const isVariable = fontFamilyName.endsWith(' Variable');
    
    // Если это вариативная версия, удаляем суффикс "Variable" для запроса к API
    const baseFontName = isVariable 
      ? fontFamilyName.substring(0, fontFamilyName.length - 9) 
      : fontFamilyName;
    
    // Вызываем функцию выбора шрифта с правильными параметрами
    selectOrAddFontsourceFont(baseFontName, isVariable);
  };

  // Обработчик выбора набора глифов
  const handleGlyphSetChange = (setKey) => {
    setActiveGlyphSet(setKey);
    setText(glyphSets[setKey]);
  };

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

  // Обработчик выбора шрифта
  const handleFontsChanged = (newFonts) => {
    handleFontsUploaded(newFonts);
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

  const { safeSelectFont } = useFontManager();

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
  
  const handleDeleteClick = () => {
    if (selectedFont?.id) {
      removeFont(selectedFont.id);
    } else {
      setSelectedFont(null);
    }
  };

  return (
    <div className="w-64 flex flex-col border-r border-blue-100 bg-white shadow-m h-screen overflow-y-auto">
      <div className="p-4">
        <h1 className="font-bold text-xl">
          <span className="text-blue-600">D</span>
          <span className="text-blue-600">I</span>
          <span className="text-blue-600">N</span>
          <span className="text-blue-600">A</span>
          <span className="text-blue-600">M</span>
          <span className="text-blue-600">O</span>
          <span className="ml-2 text-blue-500">Font Gauntlet</span>
        </h1>
        
        <div className="mt-4 relative">
          {selectedFont ? (
            <div className="flex items-center bg-white rounded-md p-2 shadow-sm relative">
              <div className="flex-1 truncate font-medium text-gray-800">{selectedFont.name}</div>
              <button 
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-all duration-150"
                onClick={(e) => {
                  e.stopPropagation(); // Предотвращаем всплытие события
                  console.log('Удаление шрифта, ID:', selectedFont?.id);
                  if (selectedFont && selectedFont.id) {
                    // Вызываем removeFont из пропсов
                    removeFont(selectedFont.id); 
                    console.log('Вызвана функция removeFont с ID:', selectedFont.id);
                  } else {
                    console.log('Нет ID шрифта, вызываем setSelectedFont(null)');
                    setSelectedFont(null);
                  }
                }}
              >
                ×
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-md shadow-sm">
              <div className="p-3 border-b border-gray-100">
                <span className="text-sm text-gray-700 font-medium">Выбрать шрифт (Fontsource)</span>
              </div>
              <div className="p-2">
                <input 
                  type="text" 
                  placeholder="Введите название шрифта..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm mb-2"
                />
                {searchTerm.length > 0 && (
                  <div className="max-h-32 overflow-y-auto">
                    {filteredFonts.length > 0 ? (
                      filteredFonts.map((fontFamilyName) => (
                        <div 
                          key={fontFamilyName} 
                          className="px-3 py-1.5 text-sm hover:bg-blue-50 cursor-pointer rounded-md transition-colors"
                          onClick={(e) => {
                            e.stopPropagation(); // Предотвращаем всплытие
                            handleFontSelection(fontFamilyName);
                          }}
                        >
                          {fontFamilyName}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-2 text-gray-500 text-sm">Шрифты не найдены</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {!selectedFont && (
          <div className="mt-4">
            <button 
              onClick={() => document.getElementById('font-upload-input').click()}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition-colors shadow-sm hover:shadow"
            >
              Загрузить шрифт
              <input 
                id="font-upload-input" 
                type="file" 
                accept=".ttf,.otf,.woff,.woff2" 
                multiple 
                className="hidden" 
                onChange={(e) => {
                  const files = Array.from(e.target.files);
                  handleFontsChanged(files.map(file => ({
                    file, 
                    name: file.name,
                    url: URL.createObjectURL(file)
                  })));
                }}
              />
            </button>
          </div>
        )}
      </div>
      
      {/* Базовые настройки шрифта */}
      <div className="p-4 pt-2 border-t border-blue-100 mt-2">
        <div>
          <h2 className="font-medium text-sm text-blue-700 mb-2">Basic Settings</h2>
          
          {selectedFont && (
            <div className="mb-4">
              <h3 className="text-xs text-gray-600 mb-1">Preset Styles</h3>
              <div className="relative">
                <button
                  className="w-full flex justify-between items-center bg-white border border-blue-200 rounded px-3 py-2 text-sm text-left focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                >
                  <span>Current: {selectedPresetName}</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    strokeWidth={1.5} 
                    stroke="currentColor" 
                    className={`w-4 h-4 transition-transform ${showPresetDropdown ? 'transform rotate-180' : ''}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                
                {showPresetDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-blue-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {console.log("[Sidebar] Rendering availableStyles:", availableStyles)}
                    {availableStyles.map((preset, index) => (
                      <button
                        key={index}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 focus:outline-none focus:bg-blue-50"
                        onClick={() => {
                          applyPresetStyle(preset.name);
                          setShowPresetDropdown(false);
                        }}
                        style={{
                          fontWeight: preset.weight,
                          fontStyle: preset.style
                        }}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="mb-3">
            <div className="flex justify-between mb-1">
              <label className="text-xs text-gray-600">Размер шрифта (TT)</label>
              <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">{fontSize}</span>
            </div>
            <input
              type="range"
              min="12"
              max="300"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none bg-gradient-to-r from-green-300 to-green-500"
              style={{
                accentColor: '#10B981' // зеленый
              }}
            />
          </div>
          
          <div className="mb-3">
            <div className="flex justify-between mb-1">
              <label className="text-xs text-gray-600">Межбуквенный интервал</label>
              <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">{letterSpacing}</span>
            </div>
            <div className="flex items-center">
              <input
                type="range"
                min="-100"
                max="100"
                value={letterSpacing}
                onChange={(e) => setLetterSpacing(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-gradient-to-r from-blue-300 to-blue-500"
                style={{
                  accentColor: '#3B82F6' // синий
                }}
              />
              <button 
                className="ml-2 text-xs border border-blue-200 rounded-md px-2 py-1 bg-white text-blue-600"
                onClick={() => setLetterSpacing(letterSpacing === 0 ? 50 : 0)}
              >
                AV
              </button>
            </div>
          </div>
          
          <div className="mb-3">
            <div className="flex justify-between mb-1">
              <label className="text-xs text-gray-600">Межстрочный интервал (TT)</label>
              <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded">{lineHeight.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={lineHeight}
              onChange={(e) => setLineHeight(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none bg-gradient-to-r from-purple-300 to-purple-500"
              style={{
                accentColor: '#8B5CF6' // фиолетовый
              }}
            />
          </div>
          
          {/* Управление стилем и направлением текста */}
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <label className="text-xs text-gray-600">Управление текстом</label>
            </div>
            
            {/* Первая группа: направление и выравнивание */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex border border-gray-200 rounded-md overflow-hidden">
                <button 
                  className={`p-2 text-xs ${textAlignment === 'left' ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-700'} hover:bg-blue-50 transition-colors border-r border-gray-200`}
                  title="Выравнивание по левому краю"
                  onClick={() => changeTextAlignmentHandler('left')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="12" x2="15" y2="12"></line>
                    <line x1="3" y1="18" x2="18" y2="18"></line>
                  </svg>
                </button>
                
                {/* Выравнивание по центру */}
                <button 
                  className={`p-2 text-xs ${textAlignment === 'center' ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-700'} hover:bg-blue-50 transition-colors border-r border-gray-200`}
                  title="Выравнивание по центру"
                  onClick={() => changeTextAlignmentHandler('center')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                    <line x1="5" y1="18" x2="19" y2="18"></line>
                  </svg>
                </button>
                
                {/* Выравнивание по правому краю */}
                <button 
                  className={`p-2 text-xs ${textAlignment === 'right' ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-700'} hover:bg-blue-50 transition-colors`}
                  title="Выравнивание по правому краю"
                  onClick={() => changeTextAlignmentHandler('right')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="9" y1="12" x2="21" y2="12"></line>
                    <line x1="6" y1="18" x2="21" y2="18"></line>
                  </svg>
                </button>
              </div>
              
              {/* Переключение регистра */}
              <div className="flex border border-gray-200 rounded overflow-hidden">
                <button 
                  className={`p-2 text-xs ${textCase === 'uppercase' ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-700'} hover:bg-blue-50 transition-colors`}
                  title="Верхний регистр (АА)"
                  onClick={toggleTextCaseHandler}
                >
                  АА
                </button>
                <button 
                  className={`p-2 text-xs ${textCase === 'none' ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-700'} hover:bg-blue-50 transition-colors`}
                  title="Обычный регистр (Аа)"
                  onClick={toggleTextCaseHandler}
                >
                  Аа
                </button>
              </div>
            </div>
            
            {/* Вторая группа: выравнивание по центру и заполнение экрана */}
            <div className="flex items-center space-x-2">
              {/* Выровнять текст по центру экрана */}
              <button 
                className={`flex-1 p-2 text-xs ${textCenter ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-700'} hover:bg-blue-50 transition-colors border border-gray-200 rounded-md flex items-center justify-center`}
                title="Выровнять текст по центру окна превью"
                onClick={toggleTextCenterHandler}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Центрировать</span>
              </button>
              
              {/* Заполнить экран текстом */}
              <button 
                className={`flex-1 p-2 text-xs ${textFill ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-700'} hover:bg-blue-50 transition-colors border border-gray-200 rounded-md flex items-center justify-center`}
                title="Заполнить весь экран текстом"
                onClick={toggleTextFillHandler}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
                <span>Заполнить</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Variable Axes - показывается только когда шрифт выбран */}
        {selectedFont && (
          <div className="border-t border-blue-100 pt-4 mb-4">
            <h2 className="font-medium text-sm text-blue-700 mb-2">Variable Axes</h2>
            <VariableFontControls 
              font={selectedFont} 
              onSettingsChange={handleVariableSettingsChange}
              isAnimating={isAnimating}
              toggleAnimation={toggleAnimation}
              animationSpeed={animationSpeed}
            />
          </div>
        )}
        
        {/* Секция настроек цвета */}
        <div className="border-t border-blue-100 pt-4 mb-4">
          <h3 className="font-medium text-sm text-blue-700 mb-2">Выбор цвета</h3>
          
          <div className="flex items-center mb-3 bg-gray-100 rounded-md overflow-hidden">
            <button 
              className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${activeColorTab === 'foreground' ? 'bg-white shadow-sm' : 'hover:bg-gray-50'}`}
              onClick={() => setActiveColorTab('foreground')}
            >
              Текст
            </button>
            <button 
              className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${activeColorTab === 'background' ? 'bg-white shadow-sm' : 'hover:bg-gray-50'}`}
              onClick={() => setActiveColorTab('background')}
            >
              Фон
            </button>
            <button 
              className="w-6 h-6 mx-1 flex items-center justify-center text-gray-500 hover:text-blue-500"
              onClick={() => {
                // Переключение между Foreground и Background
                const tempColor = textColor;
                const tempPos = fgColorPos;
                const tempSliderPos = fgSliderPos;
                
                // Обмен текстового цвета с цветом фона
                setTextColor(backgroundColor);
                setFgColorPos(bgColorPos);
                setFgSliderPos(bgSliderPos);
                
                setBackgroundColor(tempColor);
                setBgColorPos(tempPos);
                setBgSliderPos(tempSliderPos);
              }}
              title="Поменять цвета текста и фона местами"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
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
              
              <div className="flex items-center">
                <div className="flex items-center">
                  <button 
                    className="text-xs text-gray-600 mr-2 flex items-center bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
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
                    className="flex-1 border border-blue-200 rounded-md px-2 py-1 text-xs"
                  />
                ) : (
                  <input
                    type="text"
                    value={hexToRgbString(textColor)}
                    onChange={(e) => handleRgbChange(e, false)}
                    className="flex-1 border border-blue-200 rounded-md px-2 py-1 text-xs"
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
              
              <div className="flex items-center">
                <div className="flex items-center">
                  <button 
                    className="text-xs text-gray-600 mr-2 flex items-center bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
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
                    className="flex-1 border border-blue-200 rounded-md px-2 py-1 text-xs"
                  />
                ) : (
                  <input
                    type="text"
                    value={hexToRgbString(backgroundColor)}
                    onChange={(e) => handleRgbChange(e, true)}
                    className="flex-1 border border-blue-200 rounded-md px-2 py-1 text-xs"
                  />
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Нижняя панель с табами Sample Text / Glyph Sets */}
        <div className="border-t border-blue-100 pt-4 pb-4">
          <div className="flex mb-3">
            <button 
              className={`flex-1 py-1.5 text-sm font-medium text-center transition-colors rounded-l-md 
                ${activeTab === 'sample' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 bg-opacity-60 hover:bg-opacity-80'}`}
              onClick={() => setActiveTab('sample')}
            >
              Sample Text
            </button>
            <button 
              className={`flex-1 py-1.5 text-sm font-medium text-center transition-colors rounded-r-md
                ${activeTab === 'glyphs' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 bg-opacity-60 hover:bg-opacity-80'}`}
              onClick={() => setActiveTab('glyphs')}
            >
              Glyph Sets
            </button>
          </div>
          
          {activeTab === 'sample' ? (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                className="bg-white px-3 py-1.5 text-xs rounded-md text-blue-700 hover:bg-blue-50 border border-blue-200 transition-all duration-150 hover:shadow-sm"
                onClick={() => setText(sampleTexts.title)}
              >
                Title
              </button>
              <button
                className="bg-white px-3 py-1.5 text-xs rounded-md text-blue-700 hover:bg-blue-50 border border-blue-200 transition-all duration-150 hover:shadow-sm"
                onClick={() => setText(sampleTexts.pangram)}
              >
                Pangram
              </button>
              <button
                className="bg-white px-3 py-1.5 text-xs rounded-md text-blue-700 hover:bg-blue-50 border border-blue-200 transition-all duration-150 hover:shadow-sm"
                onClick={() => setText(sampleTexts.paragraph)}
              >
                Paragraph
              </button>
              <button
                className="bg-white px-3 py-1.5 text-xs rounded-md text-blue-700 hover:bg-blue-50 border border-blue-200 transition-all duration-150 hover:shadow-sm"
                onClick={() => setText(sampleTexts.wikipedia)}
              >
                Wikipedia
              </button>
            </div>
          ) : (
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  className={`px-3 py-1.5 text-xs rounded-md transition-all duration-150 
                    ${activeGlyphSet === 'entire' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'}`}
                  onClick={() => handleGlyphSetChange('entire')}
                >
                  Entire Font
                </button>
                <button
                  className={`px-3 py-1.5 text-xs rounded-md transition-all duration-150 
                    ${activeGlyphSet === 'macos' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'}`}
                  onClick={() => handleGlyphSetChange('macos')}
                >
                  MacOS Roman
                </button>
                <button
                  className={`px-3 py-1.5 text-xs rounded-md transition-all duration-150 
                    ${activeGlyphSet === 'basic' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'}`}
                  onClick={() => handleGlyphSetChange('basic')}
                >
                  Basic Latin
                </button>
                <button
                  className={`px-3 py-1.5 text-xs rounded-md transition-all duration-150 
                    ${activeGlyphSet === 'latin_extended' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'}`}
                  onClick={() => handleGlyphSetChange('latin_extended')}
                >
                  Latin Extended-A
                </button>
                <button
                  className={`px-3 py-1.5 text-xs rounded-md transition-all duration-150 
                    ${activeGlyphSet === 'overview' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'}`}
                  onClick={() => handleGlyphSetChange('overview')}
                >
                  Overview
                </button>
                <button
                  className={`px-3 py-1.5 text-xs rounded-md transition-all duration-150 
                    ${activeGlyphSet === 'windows1252' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'}`}
                  onClick={() => handleGlyphSetChange('windows1252')}
                >
                  Windows 1252
                </button>
                <button
                  className={`px-3 py-1.5 text-xs rounded-md transition-all duration-150 
                    ${activeGlyphSet === 'latin_supplement' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'}`}
                  onClick={() => handleGlyphSetChange('latin_supplement')}
                >
                  Latin Supplement
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* <<< Добавляем кнопку сброса внизу сайдбара >>> */}
      <div className="mt-auto pt-4 border-t border-gray-700">
        <ResetButton />
      </div>

    </div>
  );
}
