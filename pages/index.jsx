import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import Head from 'next/head';
import Sidebar from '../components/Sidebar';
import FontPreview from '../components/FontPreview';
import CSSModal from '../components/CSSModal';
import { toast } from 'react-toastify';
import { useFontContext } from '../contexts/FontContext';
import { useSettings } from '../contexts/SettingsContext';
import GoogleFontsCatalogPanel from '../components/GoogleFontsCatalogPanel';
import FontsourceCatalogPanel from '../components/FontsourceCatalogPanel';
import { getFormatFromExtension, sessionFontCardPreviewStyle } from '../utils/fontUtilsCommon';
import { UnderlineTab } from '../components/ui/UnderlineTab';
import { SessionFontCard } from '../components/ui/SessionFontCard';
import { EditorTabBar, EMPTY_PREFIX } from '../components/ui/EditorTabBar';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { NativeSelect } from '../components/ui/NativeSelect';
import { nativeSelectFieldClass } from '../components/ui/nativeSelectFieldClasses';
import { updateFontSettings } from '../utils/db';
import {
  collectPerFontPreviewSnapshot,
  applyPerFontPreviewSnapshot,
} from '../utils/perFontPreviewSettings';

function isFontTabId(tab) {
  return typeof tab === 'string' && tab !== 'library' && !tab.startsWith(EMPTY_PREFIX);
}

/** Вкладки внутри экрана «Все шрифты»: сессия · единый каталог */
const LIBRARY_MAIN_TABS = [
  { id: 'session', label: 'В сессии' },
  { id: 'catalog', label: 'Все' },
];

const CATALOG_SOURCE_OPTIONS = [
  { value: 'google', label: 'Google' },
  { value: 'fontsource', label: 'Fontsource' },
];

/** Подвкладки блока «В сессии»: все добавленные шрифты или по источнику */
const SESSION_FONTS_SCOPE_TABS = [
  { id: 'all', label: 'Все' },
  { id: 'local', label: 'С диска' },
  { id: 'google', label: 'Google' },
  { id: 'fontsource', label: 'Fontsource' },
];

function fontSourceLabel(font) {
  if (font.source === 'google') return 'Google Font';
  if (font.source === 'fontsource') return 'Fontsource';
  return 'Пользовательский';
}

function newEmptySlotId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

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
  /** Стартовая вкладка: одна пустая «Новый» */
  const tabBootstrap = useMemo(() => {
    const id = newEmptySlotId();
    return { firstSlotId: id, initialMain: `${EMPTY_PREFIX}${id}` };
  }, []);
  /** Пустые слоты предпросмотра (вкладки «Новый») */
  const [emptySlotIds, setEmptySlotIds] = useState(() => [tabBootstrap.firstSlotId]);
  /** Активная вкладка: каталог | empty:slotId | id шрифта */
  const [mainTab, setMainTab] = useState(() => tabBootstrap.initialMain);
  /** Подвкладка внутри «Все шрифты»: сессия | каталог (Google / Fontsource) */
  const [fontsLibraryTab, setFontsLibraryTab] = useState('session');
  /** Источник внутри вкладки «Все» */
  const [catalogSource, setCatalogSource] = useState('google');
  /** Вкладки редактора: скрытые id остаются в сессии, снова открываются с карточки */
  const [closedFontTabIds, setClosedFontTabIds] = useState([]);
  const closedFontTabIdsRef = useRef(closedFontTabIds);
  closedFontTabIdsRef.current = closedFontTabIds;
  /** Фильтр карточек в блоке «В сессии» */
  const [sessionFontsScope, setSessionFontsScope] = useState('all'); // 'all' | 'local' | 'google' | 'fontsource'
  const [isCSSModalOpen, setIsCSSModalOpen] = useState(false);

  // Используем хук useFontContext вместо useFontManager
  const {
    fonts,
    selectedFont,
    variableSettings,
    handleFontsUploaded,
    handleVariableSettingsChange,
    safeSelectFont,
    removeFont,
    setSelectedFont,
    availableStyles,
    selectedPresetName,
    applyPresetStyle,
    selectOrAddFontsourceFont,
    getFontFamily,
    getVariationSettings,
    resetVariableSettings,
    getVariableAxes,
    fontCssProperties,
    setFonts,
  } = useFontContext();

  // Добавляем ref для input загрузки файлов
  const fileInputRef = useRef(null);

  const fontsRef = useRef(fonts);
  fontsRef.current = fonts;

  const previewSettingsValuesRef = useRef({});
  previewSettingsValuesRef.current = {
    text,
    fontSize,
    lineHeight,
    letterSpacing,
    textColor,
    backgroundColor,
    viewMode,
    textDirection,
    textAlignment,
    textCase,
    textCenter,
    textFill,
  };

  const previewSettersRef = useRef({});
  previewSettersRef.current = {
    setText,
    setFontSize,
    setLineHeight,
    setLetterSpacing,
    setTextColor,
    setBackgroundColor,
    setViewMode,
    setTextDirection,
    setTextAlignment,
    setTextCase,
    setTextCenter,
    setTextFill,
  };

  const lastMainTabForPreviewRef = useRef(null);

  /** Настройки левой панели / превью — отдельно на каждую вкладку шрифта */
  useEffect(() => {
    const prevTab = lastMainTabForPreviewRef.current;
    const nextTab = mainTab;

    if (prevTab !== null && prevTab !== nextTab && isFontTabId(prevTab)) {
      const snap = collectPerFontPreviewSnapshot(previewSettingsValuesRef.current);
      setFonts((fs) =>
        fs.map((f) => (f.id === prevTab ? { ...f, previewSettings: { ...snap } } : f)),
      );
      updateFontSettings(prevTab, { previewSettings: snap }).catch(() => {});
    }

    if (isFontTabId(nextTab)) {
      const font = fontsRef.current.find((f) => f.id === nextTab);
      if (font?.previewSettings) {
        applyPerFontPreviewSnapshot(font.previewSettings, previewSettersRef.current);
      }
    }

    lastMainTabForPreviewRef.current = nextTab;
  }, [mainTab, setFonts]);

  /** После merge previewSettings в массиве fonts — обновить ссылку selectedFont */
  useEffect(() => {
    if (!selectedFont?.id) return;
    const fresh = fonts.find((f) => f.id === selectedFont.id);
    if (fresh && fresh !== selectedFont) {
      setSelectedFont(fresh);
    }
  }, [fonts, selectedFont, setSelectedFont]);

  const filteredSessionFonts = useMemo(() => {
    if (sessionFontsScope === 'all') return fonts;
    return fonts.filter((f) => f.source === sessionFontsScope);
  }, [fonts, sessionFontsScope]);

  const fontsVisibleInTabBar = useMemo(
    () => fonts.filter((f) => !closedFontTabIds.includes(f.id)),
    [fonts, closedFontTabIds],
  );

  const sessionCardPreviewStyleFor = useCallback((font) => {
    if (font.source === 'google') {
      const family = font.displayName || font.name;
      return { fontFamily: `'${family}', sans-serif`, fontSize: '20px' };
    }
    return sessionFontCardPreviewStyle(font);
  }, []);

  const handleFontsUploadedWithNav = useCallback(
    async (newFonts) => {
      const fromEmptySlot = mainTab.startsWith(EMPTY_PREFIX) ? mainTab.slice(EMPTY_PREFIX.length) : null;
      const added = await handleFontsUploaded(newFonts);
      const first = Array.isArray(newFonts) && newFonts[0];
      const src = first?.source;
      if (added?.id) {
        if (fromEmptySlot) {
          setEmptySlotIds((ids) => ids.filter((x) => x !== fromEmptySlot));
        }
        setMainTab(added.id);
      }
      setSessionFontsScope('all');
      if (src === 'google') {
        setFontsLibraryTab('catalog');
        setCatalogSource('google');
      } else if (src === 'fontsource') {
        setFontsLibraryTab('catalog');
        setCatalogSource('fontsource');
      }
      if (added?.id) {
        setClosedFontTabIds((prev) => prev.filter((id) => id !== added.id));
      }
    },
    [handleFontsUploaded, mainTab],
  );

  const selectOrAddFontsourceFontWithNav = useCallback(
    async (fontFamilyName, forceVariableFont = false) => {
      const fromEmptySlot = mainTab.startsWith(EMPTY_PREFIX) ? mainTab.slice(EMPTY_PREFIX.length) : null;
      const added = await selectOrAddFontsourceFont(fontFamilyName, forceVariableFont);
      if (added?.id) {
        if (fromEmptySlot) {
          setEmptySlotIds((ids) => ids.filter((x) => x !== fromEmptySlot));
        }
        setMainTab(added.id);
      }
      setSessionFontsScope('all');
      setFontsLibraryTab('catalog');
      setCatalogSource('fontsource');
      if (added?.id) {
        setClosedFontTabIds((prev) => prev.filter((id) => id !== added.id));
      }
    },
    [selectOrAddFontsourceFont, mainTab],
  );

  /** Выбор шрифта с сайдбара: с подсветкой вкладки, если не открыт каталог */
  const pickFont = useCallback(
    (font) => {
      safeSelectFont(font);
      setClosedFontTabIds((prev) => prev.filter((id) => id !== font.id));
      if (mainTab !== 'library') {
        setMainTab(font.id);
      }
    },
    [safeSelectFont, mainTab],
  );

  /** × на вкладке шрифта: только скрыть вкладку, шрифт остаётся в сессии */
  const closeFontTab = useCallback(
    (fontId) => {
      const prevClosed = closedFontTabIdsRef.current;
      const nextClosed = prevClosed.includes(fontId) ? prevClosed : [...prevClosed, fontId];
      setClosedFontTabIds(nextClosed);

      if (mainTab !== fontId) return;

      const visible = fonts.find((f) => !nextClosed.includes(f.id));
      if (visible) {
        setMainTab(visible.id);
        safeSelectFont(visible);
        return;
      }
      if (emptySlotIds.length > 0) {
        setMainTab(`${EMPTY_PREFIX}${emptySlotIds[0]}`);
        setSelectedFont(null);
        return;
      }
      setMainTab('library');
      setSelectedFont(null);
    },
    [mainTab, fonts, emptySlotIds, safeSelectFont, setSelectedFont],
  );

  /** × на карточке в сессии: удалить шрифт из сессии */
  const removeFontFromSession = useCallback(
    (fontId) => {
      if (mainTab === fontId) {
        setMainTab('library');
      }
      setClosedFontTabIds((prev) => prev.filter((id) => id !== fontId));
      removeFont(fontId);
    },
    [mainTab, removeFont],
  );

  useEffect(() => {
    const idSet = new Set(fonts.map((f) => f.id));
    setClosedFontTabIds((prev) => {
      const next = prev.filter((id) => idSet.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [fonts]);

  useEffect(() => {
    if (!isFontTabId(mainTab)) return;
    if (!closedFontTabIds.includes(mainTab)) return;
    const visible = fonts.find((f) => !closedFontTabIds.includes(f.id));
    if (visible) {
      setMainTab(visible.id);
      safeSelectFont(visible);
    } else if (emptySlotIds.length > 0) {
      setMainTab(`${EMPTY_PREFIX}${emptySlotIds[0]}`);
      setSelectedFont(null);
    } else {
      setMainTab('library');
      setSelectedFont(null);
    }
  }, [
    mainTab,
    closedFontTabIds,
    fonts,
    emptySlotIds,
    safeSelectFont,
    setSelectedFont,
  ]);

  const addEmptyPreviewSlot = useCallback(() => {
    const id = newEmptySlotId();
    setEmptySlotIds((s) => [...s, id]);
    setMainTab(`${EMPTY_PREFIX}${id}`);
    setSelectedFont(null);
  }, [setSelectedFont]);

  const handleRemoveEmptySlot = useCallback(
    (slotId) => {
      const tabKey = `${EMPTY_PREFIX}${slotId}`;
      setEmptySlotIds((ids) => ids.filter((x) => x !== slotId));
      if (mainTab === tabKey) {
        setMainTab('library');
      }
    },
    [mainTab],
  );

  useEffect(() => {
    if (mainTab.startsWith(EMPTY_PREFIX)) {
      setSelectedFont(null);
    }
  }, [mainTab, setSelectedFont]);

  useEffect(() => {
    if (mainTab === 'library' || mainTab.startsWith(EMPTY_PREFIX)) return;
    const exists = fonts.some((f) => f.id === mainTab);
    if (!exists) {
      setMainTab('library');
    }
  }, [fonts, mainTab]);

  useEffect(() => {
    if (!mainTab.startsWith(EMPTY_PREFIX)) return;
    const slotId = mainTab.slice(EMPTY_PREFIX.length);
    if (!emptySlotIds.includes(slotId)) {
      setMainTab('library');
    }
  }, [mainTab, emptySlotIds]);

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
  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      const newFonts = Array.from(files).map((file) => ({
        file: file,
        name: file.name,
      }));
      await handleFontsUploadedWithNav(newFonts);

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
  src: url('${selectedFont.url || 'путь/к/вашему/шрифту.ttf'}') format('${getFormatFromExtension(selectedFont.name) || 'truetype'}');
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
    <div className="flex h-screen min-h-0 flex-row overflow-hidden bg-gray-50">
      <Head>
        <title>Dynamic font — тестирование и сравнение шрифтов</title>
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
          setSelectedFont={pickFont}
          handleVariableSettingsChange={handleVariableSettingsChange}
          availableStyles={availableStyles}
          selectedPresetName={selectedPresetName}
          applyPresetStyle={applyPresetStyle}
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
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Панель вкладок — flex-шапка, всегда у верхнего края колонки */}
        <div className="z-20 flex min-h-12 w-full shrink-0 items-stretch overflow-x-auto overflow-y-hidden bg-white">
          <EditorTabBar
            mainTab={mainTab}
            emptySlotIds={emptySlotIds}
            fonts={fontsVisibleInTabBar}
            onLibraryClick={() => setMainTab('library')}
            onEmptyTabClick={(slotId) => {
              setMainTab(`${EMPTY_PREFIX}${slotId}`);
              setSelectedFont(null);
            }}
            onRemoveEmptySlot={handleRemoveEmptySlot}
            onFontClick={(font) => {
              safeSelectFont(font);
              setClosedFontTabIds((prev) => prev.filter((id) => id !== font.id));
              setMainTab(font.id);
            }}
            onRemoveFont={closeFontTab}
            onAddEmptySlot={addEmptyPreviewSlot}
          />
        </div>

        {/* Контент вкладок: «Все шрифты» — внутренний скролл у каталога, не вся страница */}
        <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden">
          {mainTab !== 'library' && (
            <FontPreview
              selectedFont={mainTab.startsWith(EMPTY_PREFIX) ? null : selectedFont}
              getFontFamily={getFontFamily}
              getVariationSettings={getVariationSettings}
              handleFontsUploaded={handleFontsUploadedWithNav}
              selectOrAddFontsourceFont={selectOrAddFontsourceFontWithNav}
              handleCSSClick={handleCSSClick}
              fontCssProperties={fontCssProperties}
            />
          )}

          {mainTab === 'library' && (
            <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white p-6">
              <div className="mb-4 flex shrink-0 border-b border-gray-200">
                {LIBRARY_MAIN_TABS.map((tab) => (
                  <UnderlineTab
                    key={tab.id}
                    isActive={fontsLibraryTab === tab.id}
                    onClick={() => setFontsLibraryTab(tab.id)}
                  >
                    {tab.label}
                  </UnderlineTab>
                ))}
              </div>

              {fontsLibraryTab === 'session' && (
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                  <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 pb-3">
                    <h2 className="shrink-0 font-medium text-lg text-gray-900">Шрифты в сессии</h2>
                    <div className="min-w-0 sm:max-w-[min(100%,18rem)] sm:min-w-[14rem]">
                      <NativeSelect
                        id="session-fonts-scope"
                        value={sessionFontsScope}
                        onChange={(e) => setSessionFontsScope(e.target.value)}
                        className={nativeSelectFieldClass()}
                        aria-label="Показать шрифты в сессии"
                      >
                        {SESSION_FONTS_SCOPE_TABS.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                  </div>
                  <div className="grid max-w-full shrink-0 grid-cols-2 gap-4 pb-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {filteredSessionFonts.map((font) => (
                      <SessionFontCard
                        key={font.id}
                        selected={selectedFont === font}
                        title={font.displayName || font.name}
                        subtitle={fontSourceLabel(font)}
                        previewStyle={sessionCardPreviewStyleFor(font)}
                        onCardClick={() => {
                          safeSelectFont(font);
                          setClosedFontTabIds((prev) => prev.filter((id) => id !== font.id));
                          setMainTab(font.id);
                        }}
                        onRemove={() => removeFontFromSession(font.id)}
                      />
                    ))}

                    {(sessionFontsScope === 'all' || sessionFontsScope === 'local') && (
                      <div
                        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-4 text-center transition-colors duration-200 hover:bg-gray-50"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="h-5 w-5 text-gray-600"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        </div>
                        <div className="text-sm font-medium">Загрузить с диска</div>
                        <div className="mt-1 text-xs text-gray-500">TTF, OTF, WOFF или WOFF2</div>
                      </div>
                    )}
                  </div>
                  {filteredSessionFonts.length === 0 &&
                    sessionFontsScope !== 'all' &&
                    sessionFontsScope !== 'local' && (
                      <p className="shrink-0 text-sm text-gray-500">
                        В этом разделе пока пусто. Откройте «Все» и выберите каталог Google или Fontsource, чтобы
                        добавить шрифт.
                      </p>
                    )}
                </div>
              )}

              {fontsLibraryTab === 'catalog' && (
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  {catalogSource === 'google' ? (
                    <GoogleFontsCatalogPanel
                      fonts={fonts}
                      handleFontsUploaded={handleFontsUploadedWithNav}
                      trailingToolbar={
                        <SegmentedControl
                          value={catalogSource}
                          onChange={setCatalogSource}
                          options={CATALOG_SOURCE_OPTIONS}
                          variant="surface"
                          className="min-w-[11rem] max-w-full"
                        />
                      }
                    />
                  ) : (
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
                      <div className="mb-2 flex shrink-0 justify-end border-b border-gray-200 pb-2">
                        <SegmentedControl
                          value={catalogSource}
                          onChange={setCatalogSource}
                          options={CATALOG_SOURCE_OPTIONS}
                          variant="surface"
                          className="min-w-[11rem] max-w-full"
                        />
                      </div>
                      <p className="mb-2 max-w-3xl shrink-0 text-xs text-gray-500">
                        Пакеты @fontsource из package.json всегда в списке. Удаление из сессии не убирает строку —
                        снова нажмите «Добавить в сессию».
                      </p>
                      <FontsourceCatalogPanel
                        fonts={fonts}
                        selectOrAddFontsourceFont={selectOrAddFontsourceFontWithNav}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 