import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import Head from 'next/head';
import Sidebar from '../Sidebar';
import FontPreview from '../FontPreview';
import ExportModal from '../ExportModal';
import GenerateFontModal from '../GenerateFontModal';
import { EditorTabBar, EMPTY_PREFIX } from '../ui/EditorTabBar';
import { LibraryShareDialog } from '../ui/LibraryShareDialog';
import { FontsLibraryHomeScreen } from '../library/FontsLibraryHomeScreen';
import { LibraryCreateDialog } from '../library/LibraryCreateDialog';
import { EDITOR_MAIN_TAB_PENDING } from '../../utils/editorShellStorage';
import { EDITOR_SAMPLE_TEXTS } from '../../constants/editorSampleTexts';
import type { EditorHomeLayoutProps } from '../../types/editorHome';
import type { SessionFontRecord } from '../../types/editorFonts';

const HOME_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://dynamicfont.ru/#website',
      name: 'DINAMIC FONT',
      url: 'https://dynamicfont.ru/',
      inLanguage: 'ru-RU',
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://dynamicfont.ru/#app',
      name: 'DINAMIC FONT',
      applicationCategory: 'DesignApplication',
      operatingSystem: 'Web',
      url: 'https://dynamicfont.ru/',
      description:
        'Онлайн-редактор для тестирования, сравнения и экспорта шрифтов, работы с Google Fonts, Fontsource, Fontshare и локальными файлами.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'RUB',
      },
    },
  ],
};

function EditorTabBarSkeleton() {
  return (
    <div className="flex w-full items-center gap-2 px-3 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        <div className="h-8 w-28 rounded-md bg-gray-100 animate-pulse" />
        <div className="h-8 w-44 rounded-md bg-gray-100 animate-pulse" />
        <div className="h-8 w-24 rounded-md bg-gray-100 animate-pulse" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-8 w-20 rounded-md bg-gray-100 animate-pulse" />
        <div className="h-8 w-10 rounded-md bg-gray-100 animate-pulse" />
      </div>
    </div>
  );
}

function EditorPendingContentSkeleton() {
  return (
    <main className="min-h-0 flex-1 overflow-auto bg-gray-50">
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-center gap-6 px-6 py-10">
        <section className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Онлайн-инструмент для работы со шрифтами
          </p>
          <h1 className="mt-3 max-w-3xl text-2xl font-semibold uppercase tracking-tight text-gray-900 sm:text-4xl">
            DINAMIC FONT — тестирование, сравнение и экспорт шрифтов
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-gray-600 sm:text-base">
            Проверяйте Google Fonts, Fontsource, Fontshare и локальные файлы в редакторе, сравнивайте
            вариативные шрифты, собирайте библиотеки, делитесь подборками и экспортируйте результат для сайта.
          </p>
          <div className="mt-6 grid gap-3 text-sm text-gray-700 sm:grid-cols-3">
            <div>
              <h2 className="text-xs font-semibold uppercase text-gray-900">Каталоги</h2>
              <p className="mt-1 leading-relaxed">Поиск и открытие семейств из Google Fonts, Fontsource и Fontshare.</p>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase text-gray-900">Редактор</h2>
              <p className="mt-1 leading-relaxed">Plain, waterfall, glyphs, styles и настройка осей variable fonts.</p>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase text-gray-900">Библиотеки</h2>
              <p className="mt-1 leading-relaxed">Сохранение, сравнение, шаринг и скачивание подборок шрифтов.</p>
            </div>
          </div>
          <nav className="mt-6 flex flex-wrap gap-3 text-xs font-semibold uppercase">
            <a className="text-accent hover:text-accent-hover" href="/help">
              База знаний
            </a>
            <a className="text-gray-700 hover:text-gray-950" href="/legal/terms">
              Условия
            </a>
            <a className="text-gray-700 hover:text-gray-950" href="/legal/privacy">
              Конфиденциальность
            </a>
          </nav>
        </section>
      </div>
    </main>
  );
}

function EditorFontTabLoadingSkeleton() {
  return (
    <div className="min-h-0 flex-1 bg-gray-50" aria-hidden>
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-3 px-6 py-6">
        <div className="h-10 w-72 rounded-md bg-gray-100 animate-pulse" />
        <div className="h-72 w-full rounded-xl bg-gray-100 animate-pulse" />
        <div className="h-10 w-60 rounded-md bg-gray-100 animate-pulse" />
        <div className="h-28 w-full rounded-xl bg-gray-100 animate-pulse" />
      </div>
    </div>
  );
}

type SidebarLayoutSlice = {
  activeSavedLibrary?: { id?: string } | null;
  fontLibraries?: unknown;
  onOpenFontLibrary?: unknown;
  onCreateFontLibrary?: unknown;
  onUpdateFontLibrary?: unknown;
  onDeleteFontLibrary?: unknown;
  onReorderFontLibraries?: unknown;
  onAddFontToLibrary?: unknown;
  requestOpenCreateLibrary?: () => void;
  requestOpenEditLibrary?: (library: unknown) => void;
  openCreateLibrarySignal?: number;
  setOpenCreateLibrarySignal?: Dispatch<SetStateAction<number>>;
  onShareLibrary?: unknown;
  pickFont?: unknown;
  handleVariableSettingsChange?: unknown;
  availableStyles?: unknown;
  selectedPresetName?: unknown;
  applyPresetStyle?: unknown;
  catalogSubsetOptions?: unknown;
  activeCatalogSubset?: unknown;
  onCatalogSubsetChange?: unknown;
  getVariableAxes?: unknown;
  variableSettings?: unknown;
  resetVariableSettings?: unknown;
};

/**
 * Разметка главного экрана редактора: head, модалки, сайдбар, таббар, превью / библиотека.
 */
export function EditorHomeLayout({
  cssString,
  modals,
  fileUpload,
  sidebar,
  tabBar,
  preview,
  libraryScreenProps,
  libraryCreateDialog,
}: EditorHomeLayoutProps) {
  const sidebarSlice = sidebar as SidebarLayoutSlice;
  const {
    mainTab,
    emptySlotIds,
    emptySlotLabelsById,
    fontsVisibleInTabBar,
    fontTabPlaceholders,
    catalogPreviewSlotsById,
    openAllFontsTab,
    handleRemoveEmptySlot,
    addEmptyPreviewSlot,
    closeFontTab,
    setMainTab,
    setClosedLibraryFontIds,
    safeSelectFont,
    setSelectedFont,
    tabBarEndActions,
  } = tabBar;

  const {
    plainPreviewOpen,
    closePlainPreview,
    getFontFamily,
    getVariationSettings,
    handleFontsUploadedWithNav,
    selectOrAddFontsourceFontWithNav,
    fontCssProperties,
    variableSettings,
    exportedFont,
    fontLibraries,
    moveFontEntryToLibrary,
    requestCreateLibraryWithFonts,
    handleEmptyTabSelectionActionsChange,
    isAnimating,
    toggleAnimation,
    liveWaterfallBaseSize,
    handleWaterfallBaseSizeLiveChange,
    handleWaterfallBaseSizeCommit,
    sidebarSelectedFont,
    openGoogleCatalogEntryInEditorTab,
  } = preview;

  const renderTabContent = () => {
    const isPendingTab = mainTab === EDITOR_MAIN_TAB_PENDING;
    const isLibraryTab = mainTab === 'library';
    const isEmptyTab = String(mainTab).startsWith(EMPTY_PREFIX);
    const isFontTab = !isPendingTab && !isLibraryTab && !isEmptyTab;
    const selected = sidebarSelectedFont as SessionFontRecord | null | undefined;
    const fontIsReady = Boolean(selected && selected.id === mainTab);

    if (isFontTab && !fontIsReady) {
      return <EditorFontTabLoadingSkeleton />;
    }
    if (isPendingTab || isLibraryTab) return null;
    if (!(isEmptyTab || fontIsReady)) return null;

    const fontPreviewProps = {
      selectedFont: sidebarSelectedFont,
      variableSettings,
      exportedFont,
      getFontFamily,
      getVariationSettings,
      handleFontsUploaded: handleFontsUploadedWithNav,
      selectOrAddFontsourceFont: selectOrAddFontsourceFontWithNav,
      fontCssProperties,
      isVariableFontAnimating: isAnimating,
      plainPreviewOpen,
      onClosePlainPreview: closePlainPreview,
      fontLibraries,
      onMoveFontToLibrary: moveFontEntryToLibrary,
      onRequestCreateLibrary: requestCreateLibraryWithFonts,
      onSelectionActionsChange: handleEmptyTabSelectionActionsChange,
      selectionActionsActive: isEmptyTab,
      currentWaterfallBaseSize: liveWaterfallBaseSize,
      openGoogleCatalogEntryInEditorTab,
    };

    return <FontPreview {...(fontPreviewProps as Parameters<typeof FontPreview>[0])} />;
  };

  const slots = catalogPreviewSlotsById as Record<string, SessionFontRecord | null> | undefined;

  // Не перемонтируем библиотечный экран при каждом переключении вкладок —
  // иначе каталог пересчитывается (facet maps / merge) каждый раз заново.
  const [hasEverMountedLibraryScreen, setHasEverMountedLibraryScreen] = useState<boolean>(() => mainTab === 'library');
  useEffect(() => {
    if (mainTab === 'library') setHasEverMountedLibraryScreen(true);
  }, [mainTab]);

  return (
    <div className="flex h-screen min-h-0 flex-row overflow-hidden bg-gray-50">
      <Head>
        <title>DINAMIC FONT — тестирование и сравнение шрифтов</title>
        <meta
          name="description"
          content="DINAMIC FONT — онлайн-редактор для тестирования, сравнения, библиотек и экспорта шрифтов из Google Fonts, Fontsource, Fontshare и локальных файлов."
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(HOME_JSON_LD) }}
        />
        {cssString ? <style>{cssString}</style> : null}
      </Head>

      <ExportModal {...(modals.export as unknown as Parameters<typeof ExportModal>[0])} />
      <GenerateFontModal {...(modals.generate as unknown as Parameters<typeof GenerateFontModal>[0])} />
      <LibraryShareDialog {...(modals.libraryShare as unknown as Parameters<typeof LibraryShareDialog>[0])} />
      <LibraryCreateDialog
        {...(libraryCreateDialog as unknown as Parameters<typeof LibraryCreateDialog>[0])}
      />

      <input
        type="file"
        ref={fileUpload.inputRef}
        id="font-upload-input"
        className="hidden"
        accept=".ttf,.otf,.woff,.woff2"
        multiple
        onChange={fileUpload.onChange}
      />

      <div className="h-screen sticky top-0 left-0">
        <Sidebar
          selectedFont={sidebarSelectedFont}
          isLibraryTab={mainTab === 'library'}
          activeLibraryId={sidebarSlice.activeSavedLibrary?.id || null}
          fontLibraries={sidebarSlice.fontLibraries as unknown[]}
          onOpenFontLibrary={sidebarSlice.onOpenFontLibrary}
          onCreateFontLibrary={sidebarSlice.onCreateFontLibrary}
          onUpdateFontLibrary={sidebarSlice.onUpdateFontLibrary}
          onDeleteFontLibrary={sidebarSlice.onDeleteFontLibrary}
          onReorderFontLibraries={sidebarSlice.onReorderFontLibraries}
          onAddFontToLibrary={sidebarSlice.onAddFontToLibrary}
          requestOpenCreateLibrary={sidebarSlice.requestOpenCreateLibrary}
          requestOpenEditLibrary={sidebarSlice.requestOpenEditLibrary}
          openCreateLibrarySignal={sidebarSlice.openCreateLibrarySignal}
          setOpenCreateLibrarySignal={sidebarSlice.setOpenCreateLibrarySignal}
          onShareLibrary={sidebarSlice.onShareLibrary}
          onLogoClick={openAllFontsTab}
          setSelectedFont={sidebarSlice.pickFont}
          handleVariableSettingsChange={sidebarSlice.handleVariableSettingsChange}
          availableStyles={sidebarSlice.availableStyles}
          selectedPresetName={sidebarSlice.selectedPresetName}
          applyPresetStyle={sidebarSlice.applyPresetStyle}
          catalogSubsetOptions={sidebarSlice.catalogSubsetOptions as { value: string; label: string }[]}
          activeCatalogSubset={String(sidebarSlice.activeCatalogSubset || '')}
          onCatalogSubsetChange={sidebarSlice.onCatalogSubsetChange as (subset: string) => void}
          getVariableAxes={sidebarSlice.getVariableAxes}
          variableSettings={sidebarSlice.variableSettings}
          resetVariableSettings={sidebarSlice.resetVariableSettings}
          isAnimating={isAnimating}
          toggleAnimation={toggleAnimation}
          sampleTexts={EDITOR_SAMPLE_TEXTS}
          currentWaterfallBaseSize={liveWaterfallBaseSize}
          onWaterfallBaseSizeLiveChange={handleWaterfallBaseSizeLiveChange}
          onWaterfallBaseSizeCommit={handleWaterfallBaseSizeCommit}
        />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="editor-tabbar-container z-20 flex min-h-12 w-full shrink-0 items-stretch overflow-visible bg-white">
          {mainTab === EDITOR_MAIN_TAB_PENDING ? (
            <EditorTabBarSkeleton />
          ) : (
            <EditorTabBar
              mainTab={String(mainTab)}
              emptySlotIds={emptySlotIds as string[]}
              emptySlotLabelsById={emptySlotLabelsById as Record<string, string>}
              fonts={fontsVisibleInTabBar as SessionFontRecord[]}
              fontTabPlaceholders={fontTabPlaceholders as { id: string; label: string }[] | null}
              showNewTabSsrFallback={false}
              onLibraryClick={openAllFontsTab as () => void}
              onEmptyTabClick={(slotId: string) => {
                (setMainTab as (tab: string) => void)(`${EMPTY_PREFIX}${slotId}`);
                const previewFont = slots?.[slotId] || null;
                if (previewFont) {
                  (safeSelectFont as (font: SessionFontRecord) => void)(previewFont);
                } else {
                  (setSelectedFont as (font: SessionFontRecord | null) => void)(null);
                }
              }}
              onRemoveEmptySlot={handleRemoveEmptySlot as (slotId: string) => void}
              onFontClick={(font: SessionFontRecord) => {
                (setClosedLibraryFontIds as Dispatch<SetStateAction<string[]>>)((prev) =>
                  prev.filter((id) => id !== font.id),
                );
                (safeSelectFont as (f: SessionFontRecord) => void)(font);
                (setMainTab as (tab: string) => void)(font.id);
              }}
              onRemoveFont={closeFontTab as (fontId: string) => void}
              onAddEmptySlot={addEmptyPreviewSlot as () => void}
              endActions={tabBarEndActions}
            />
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden">
          {renderTabContent()}
          {mainTab === EDITOR_MAIN_TAB_PENDING && <EditorPendingContentSkeleton />}
          {hasEverMountedLibraryScreen ? (
            <div
              className={
                mainTab === 'library'
                  ? 'flex min-h-0 flex-1 flex-col'
                  : 'hidden'
              }
              aria-hidden={mainTab !== 'library'}
            >
              <FontsLibraryHomeScreen
                screenActive={mainTab === 'library'}
                {...(libraryScreenProps as unknown as Parameters<typeof FontsLibraryHomeScreen>[0])}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
