import React, { useState, useRef, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Sidebar from '../components/Sidebar';
import FontPreview from '../components/FontPreview';
import CSSModal from '../components/CSSModal';
import { toast } from 'react-toastify';
import { useFontContext } from '../contexts/FontContext';
import { useSettings } from '../contexts/SettingsContext';

export default function Home() {
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
  
  
  // Оставляем состояния, которые не были перенесены
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [cssString, setCssString] = useState('');
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' или 'fonts'
  const [isCSSModalOpen, setIsCSSModalOpen] = useState(false);
  // Эти состояния больше не используются или не нужны здесь
  // const [isChangingTab, setIsChangingTab] = useState(false);
  // const [currentView, setCurrentView] = useState('preview');

  // Используем хук useFontContext вместо useFontManager
  const {
    fonts,
    selectedFont,
    variableSettings,
    handleFontsUploaded,
    handleVariableSettingsChange,
    safeSelectFont,
    removeFont,
    availableStyles,
    selectedPresetName,
    applyPresetStyle,
    selectOrAddFontsourceFont,
    getFontFamily,
    getVariationSettings,
    resetVariableSettings,
    getVariableAxes,
    fontCssProperties,
  } = useFontContext();

  // Добавляем ref для input загрузки файлов
  const fileInputRef = useRef(null);

  // Получаем формат шрифта по расширению файла
  const getFontFormat = (filename) => {
    if (!filename) return 'truetype';
    const ext = filename.split('.').pop().toLowerCase();
    switch(ext) {
      case 'ttf': return 'truetype';
      case 'otf': return 'opentype';
      case 'woff': return 'woff';
      case 'woff2': return 'woff2';
      default: return 'truetype';
    }
  };

  const toggleAnimation = () => {
    setIsAnimating(!isAnimating);
  };

  const sampleTexts = {
    glyph: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    title: 'The Quick Brown Fox Jumps Over The Lazy Dog',
    pangram: 'Pack my box with five dozen liquor jugs.',
    paragraph: 'Typography is the art and technique of arranging type to make written language legible, readable and appealing when displayed. The arrangement of type involves selecting typefaces, point sizes, line lengths, line-spacing, and letter-spacing.',
    wikipedia: 'In metal typesetting, a font was a particular size, weight and style of a typeface. Each font was a matched set of type, one piece for each glyph, and a typeface consisting of a range of fonts that shared an overall design.'
  };

  // Функция для обработки загрузки файлов через кнопку
  const handleFileUpload = (e) => {
    const files = e.target.files;
    console.log('[handleFileUpload] Файлы выбраны:', files.length);
    if (files.length > 0) {
      const newFonts = Array.from(files).map(file => ({
        file: file, // File объект уже является Blob
        name: file.name
      }));
      console.log('[handleFileUpload] Вызываем handleFontsUploaded с:', newFonts);
      handleFontsUploaded(newFonts);
      
      // Очищаем значение input, чтобы можно было повторно выбрать тот же файл
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCSSClick = () => {
    // Если нет шрифта или не выбран шрифт, не делаем ничего
    if (!selectedFont) {
      toast.error('Сначала выберите шрифт');
      return;
    }
    
    // Формируем полный CSS код с @font-face правилом и примером использования
    let cssCode = '';
    
    // Добавляем @font-face правило
    cssCode += `/* @font-face правило для загрузки шрифта */
@font-face {
  font-family: '${selectedFont.fontFamily || selectedFont.name}';
  src: url('${selectedFont.url || 'путь/к/вашему/шрифту.ttf'}') format('${getFontFormat(selectedFont.name)}');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}\n\n`;
    
    // Если это вариативный шрифт и есть настройки осей, добавляем CSS переменные
    if (selectedFont.isVariableFont && variableSettings && Object.keys(variableSettings).length > 0) {
      cssCode += `/* CSS переменные для вариативных осей */
:root {
${Object.entries(variableSettings).map(([tag, value]) => `  --font-${tag}: ${value};`).join('\n')}
}\n\n`;
      
      // Добавляем пример использования с вариативными осями
      const variationSettingsStr = Object.entries(variableSettings)
        .map(([tag, value]) => `"${tag}" var(--font-${tag})`)
        .join(', ');
      
      cssCode += `/* Пример использования вариативного шрифта */
.your-element {
  font-family: '${selectedFont.fontFamily || selectedFont.name}', sans-serif;
  font-variation-settings: ${variationSettingsStr};
  font-size: ${fontSize}px;
  line-height: ${lineHeight};
  letter-spacing: ${(letterSpacing / 100) * 0.5}em;
  color: ${textColor || '#000000'};
  direction: ${textDirection};
  text-align: ${textAlignment};
  text-transform: ${textCase};
}\n\n`;

      // Добавим примеры предустановленных стилей
      cssCode += `/* Примеры предустановленных стилей на основе вариативных осей */
.font-light {
  font-variation-settings: "wght" 300;
}
.font-regular {
  font-variation-settings: "wght" 400;
}
.font-medium {
  font-variation-settings: "wght" 500;
}
.font-bold {
  font-variation-settings: "wght" 700;
}
`;
    } else {
      // Обычный шрифт без вариативных осей
      cssCode += `/* Пример использования шрифта */
.your-element {
  font-family: '${selectedFont.fontFamily || selectedFont.name}', sans-serif;
  font-size: ${fontSize}px;
  line-height: ${lineHeight};
  letter-spacing: ${(letterSpacing / 100) * 0.5}em;
  color: ${textColor || '#000000'};
  direction: ${textDirection};
  text-align: ${textAlignment};
  text-transform: ${textCase};
}\n`;
    }
    
    // Сохраняем CSS строку и открываем модальное окно
    setCssString(cssCode);
    setIsCSSModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-row bg-gray-50">
      <Head>
        <title>Font Gauntlet - Тестирование и сравнение шрифтов</title>
        <meta name="description" content="Профессиональный инструмент для тестирования и сравнения шрифтов" />
        <link rel="icon" href="/favicon.ico" />
        {cssString && <style>{cssString}</style>}
      </Head>

      {/* Модальное окно CSS */}
      <CSSModal 
        isOpen={isCSSModalOpen}
        onClose={() => setIsCSSModalOpen(false)}
        cssCode={cssString}
        fontName={selectedFont?.name}
      />

      {/* Скрытый input для загрузки файлов */}
      <input
        type="file"
        ref={fileInputRef}
        id="font-upload-input"
        className="hidden"
        accept=".ttf,.otf,.woff,.woff2"
        multiple
        onChange={handleFileUpload}
      />

      {/* Левая сайдбар панель */}
      <div className="h-screen sticky top-0 left-0">
        <Sidebar
          selectedFont={selectedFont}
          setSelectedFont={safeSelectFont}
          handleFontsUploaded={handleFontsUploaded}
          removeFontProp={removeFont}
          handleVariableSettingsChange={handleVariableSettingsChange}
          availableStyles={availableStyles}
          selectedPresetName={selectedPresetName}
          applyPresetStyle={applyPresetStyle}
          selectOrAddFontsourceFont={selectOrAddFontsourceFont}
          getVariableAxes={getVariableAxes}
          variableSettings={variableSettings}
          resetVariableSettings={resetVariableSettings}
          isAnimating={isAnimating}
          toggleAnimation={toggleAnimation}
          animationSpeed={animationSpeed}
          setAnimationSpeed={setAnimationSpeed}
          sampleTexts={sampleTexts}
        />
      </div>

      {/* Основная область просмотра с вкладками */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Панель вкладок */}
        <div className="bg-white border-b border-blue-100 absolute top-0 left-0 right-0 z-10">
          <div className="flex justify-between">
            <div className="flex">
              <button 
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-3 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'preview' 
                    ? 'text-blue-600 border-b-2 border-blue-500' 
                    : 'text-gray-500 hover:text-blue-500'
                }`}
              >
                Просмотр
              </button>
              <button 
                onClick={() => setActiveTab('fonts')}
                className={`px-4 py-3 font-medium text-sm transition-colors duration-200 ${
                  activeTab === 'fonts' 
                    ? 'text-blue-600 border-b-2 border-blue-500' 
                    : 'text-gray-500 hover:text-blue-500'
                }`}
              >
                Все шрифты
              </button>
            </div>
            
            {/* View Mode Controls */}
            {activeTab === 'preview' && (
              <div className="flex items-center pr-4">
                <span className="text-xs text-gray-600 mr-2">View Mode:</span>
                <div className="flex h-8 rounded-md overflow-hidden border border-blue-200 bg-white">
                  <button 
                    className={`px-3 text-xs transition-colors ${viewMode === 'plain' ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'}`}
                    onClick={() => setViewMode('plain')}
                  >
                    Plain
                  </button>
                  <button 
                    className={`px-3 text-xs transition-colors ${viewMode === 'waterfall' ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'}`}
                    onClick={() => setViewMode('waterfall')}
                  >
                    Waterfall
                  </button>
                  <button 
                    className={`px-3 text-xs transition-colors ${viewMode === 'glyphs' ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'}`}
                    onClick={() => setViewMode('glyphs')}
                  >
                    Glyphs
                  </button>
                  <button 
                    className={`px-3 text-xs transition-colors ${viewMode === 'styles' ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'}`}
                    onClick={() => setViewMode('styles')}
                  >
                    Styles
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Контент вкладок */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex">
          {activeTab === 'preview' && (
            <>
            <FontPreview 
              selectedFont={selectedFont}
              getFontFamily={getFontFamily}
              getVariationSettings={getVariationSettings}
              handleFontsUploaded={handleFontsUploaded}
              handleCSSClick={handleCSSClick}
              fontCssProperties={fontCssProperties}
            />
            </>
          )}
          
          {activeTab === 'fonts' && (
            <div className="bg-white h-full w-full p-6 overflow-x-hidden">
              <h2 className="font-medium text-lg text-blue-700 mb-4 pt-10">Все шрифты</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-w-full">
                {fonts.map((font, index) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 relative ${
                      selectedFont === font 
                        ? 'bg-blue-50 border-blue-300 shadow-sm' 
                        : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50'
                    }`}
                    onClick={() => {
                      safeSelectFont(font);
                      setActiveTab('preview'); // Переключаемся на просмотр при выборе шрифта
                    }}
                  >
                    <div className="font-medium text-sm truncate">{font.name}</div>
                    <div 
                      className="mt-2 truncate" 
                      style={{ fontFamily: font.fontFamily ? `'${font.fontFamily}'` : `'${font.name}'`, fontSize: '20px' }}
                    >
                      AaBbCcDdEe
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {font.source === 'google' ? 'Google Font' : 'Пользовательский'}
                    </div>
                    {/* Кнопка удаления */}
                    <button 
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation(); // Предотвращаем всплытие события клика
                        removeFont(font.id); // Вызываем функцию удаления шрифта
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                
                {/* Кнопка для загрузки нового шрифта */}
                <div className="p-4 rounded-lg border border-dashed border-blue-300 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-50 transition-colors duration-200"
                  onClick={() => fileInputRef.current?.click()}>
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                  <div className="font-medium text-sm text-blue-600">Загрузить шрифт</div>
                  <div className="text-xs text-gray-500 mt-1">TTF, OTF, WOFF или WOFF2</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 