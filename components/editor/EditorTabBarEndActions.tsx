import { Tooltip } from '../ui/Tooltip';
import { SelectionToolbarActions } from '../library/SelectionToolbarActions';
import { LibraryMoveMenu } from '../library/LibraryMoveMenu';
import { EMPTY_PREFIX } from '../ui/EditorTabBar';
import { EDITOR_MAIN_TAB_PENDING } from '../../utils/editorShellStorage';
import type { SavedLibraryRecord, SessionFontRecord } from '../../types/editorFonts';
import type { SavedLibraryFontEntry, SelectionToolbarActions as SelectionToolbarActionsState } from '../../types/savedLibrary';

export type EditorTabBarEndActionsProps = {
  mainTab: string;
  fontsLibraryTab: string;
  activeSavedLibrary: SavedLibraryRecord | null;
  selectedFont: SessionFontRecord | null;
  fontLibraries: SavedLibraryRecord[];
  catalogSelectionActions: SelectionToolbarActionsState;
  emptyTabSelectionActions: SelectionToolbarActionsState;
  selectedSavedLibraryFontIds: Set<string>;
  isSavedLibraryMoveBusy: boolean;
  moveSelectedSavedLibraryFonts: (targetLibraryId: string) => void;
  requestCreateLibraryWithFonts: (fonts: SavedLibraryFontEntry[]) => void;
  selectedSavedLibraryFonts: SavedLibraryFontEntry[];
  selectedSavedLibraryDownloadableCount: number;
  downloadSelectedSavedLibrary: (() => void) | null;
  downloadSelectedSavedLibraryAsFormat: ((format: string) => void) | null;
  onGenerateClick: () => void;
  onExportClick: () => void;
  onPlainPreviewOpen: () => void;
};

/**
 * Правая часть таббара: selection toolbar (каталог / библиотека / empty) или кнопки редактора.
 */
export function EditorTabBarEndActions({
  mainTab,
  fontsLibraryTab,
  activeSavedLibrary,
  selectedFont,
  fontLibraries,
  catalogSelectionActions,
  emptyTabSelectionActions,
  selectedSavedLibraryFontIds,
  isSavedLibraryMoveBusy,
  moveSelectedSavedLibraryFonts,
  requestCreateLibraryWithFonts,
  selectedSavedLibraryFonts,
  selectedSavedLibraryDownloadableCount,
  downloadSelectedSavedLibrary,
  downloadSelectedSavedLibraryAsFormat,
  onGenerateClick,
  onExportClick,
  onPlainPreviewOpen,
}: EditorTabBarEndActionsProps) {
  const showCatalogToolbar = mainTab === 'library' && fontsLibraryTab === 'catalog';
  const showSavedLibraryToolbar = mainTab === 'library' && Boolean(activeSavedLibrary);
  const showEmptyTabToolbar = mainTab.startsWith(EMPTY_PREFIX);
  const showFontToolbar =
    mainTab !== EDITOR_MAIN_TAB_PENDING && mainTab !== 'library' && !showEmptyTabToolbar && Boolean(selectedFont);

  if (showCatalogToolbar) {
    return (
      <SelectionToolbarActions
        selectedCount={catalogSelectionActions.selectedCount || 0}
        moveControl={
          <LibraryMoveMenu
            hasSelection={(catalogSelectionActions.selectedCount || 0) > 0}
            libraries={fontLibraries}
            currentLibraryId={null}
            onMoveToLibrary={catalogSelectionActions.moveSelected ?? undefined}
            onCreateLibrary={catalogSelectionActions.createLibraryFromSelection ?? undefined}
          />
        }
        downloadSelected={catalogSelectionActions.downloadSelected}
        downloadSelectedAsFormat={catalogSelectionActions.downloadSelectedAsFormat}
        emptyTooltip="Выделите карточки в каталоге (долгий зажим), чтобы скачать несколько шрифтов"
      />
    );
  }

  if (showSavedLibraryToolbar) {
    return (
      <SelectionToolbarActions
        selectedCount={selectedSavedLibraryFontIds.size}
        moveControl={
          <LibraryMoveMenu
            hasSelection={selectedSavedLibraryFontIds.size > 0}
            busy={isSavedLibraryMoveBusy}
            libraries={fontLibraries}
            currentLibraryId={activeSavedLibrary?.id || null}
            onMoveToLibrary={moveSelectedSavedLibraryFonts}
            onCreateLibrary={() => requestCreateLibraryWithFonts(selectedSavedLibraryFonts)}
          />
        }
        downloadSelected={selectedSavedLibraryDownloadableCount > 0 ? downloadSelectedSavedLibrary : null}
        downloadSelectedAsFormat={
          selectedSavedLibraryDownloadableCount > 0 ? downloadSelectedSavedLibraryAsFormat : null
        }
        emptyTooltip="Выделите карточки в библиотеке (долгий зажим), чтобы скачать несколько шрифтов"
      />
    );
  }

  if (showEmptyTabToolbar) {
    return (
      <SelectionToolbarActions
        selectedCount={emptyTabSelectionActions.selectedCount || 0}
        moveControl={
          <LibraryMoveMenu
            hasSelection={(emptyTabSelectionActions.selectedCount || 0) > 0}
            libraries={fontLibraries}
            currentLibraryId={null}
            onMoveToLibrary={emptyTabSelectionActions.moveSelected ?? undefined}
            onCreateLibrary={emptyTabSelectionActions.createLibraryFromSelection ?? undefined}
          />
        }
        downloadSelected={emptyTabSelectionActions.downloadSelected}
        downloadSelectedAsFormat={emptyTabSelectionActions.downloadSelectedAsFormat}
        emptyTooltip="Выделите карточки в быстром поиске (долгий зажим), чтобы скачать несколько шрифтов"
      />
    );
  }

  if (!showFontToolbar || !selectedFont) return null;

  const canGenerate = Boolean(selectedFont.isVariableFont);
  return (
    <>
      <Tooltip
        as="span"
        content={
          canGenerate ? 'Статический файл по текущим осям (VF)' : 'Доступно только для вариативных шрифтов'
        }
        className="inline-flex"
      >
        <button
          type="button"
          disabled={!canGenerate}
          onClick={onGenerateClick}
          className="inline-flex h-8 w-40.5 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-gray-200 bg-white px-3 text-xs uppercase font-semibold leading-none text-gray-800 transition-colors hover:text-white hover:bg-black/[0.9] hover:border-black/[0.9] disabled:cursor-not-allowed disabled:border-gray-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:hover:bg-gray-50 disabled:hover:text-gray-400"
        >
          Генерация
        </button>
      </Tooltip>
      <Tooltip content="Копирование, скачивание файла">
        <button
          type="button"
          onClick={onExportClick}
          className="inline-flex h-8 w-40.5 shrink-0 cursor-pointer items-center justify-center rounded-sm bg-accent px-3 text-xs uppercase font-semibold leading-none text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed"
          aria-label="Экспорт CSS: предпросмотр, копирование, скачивание файла"
        >
          Экспорт
        </button>
      </Tooltip>
      <div className="flex self-stretch">
        <Tooltip content="Полноэкранное превью" className="h-full">
          <button
            type="button"
            onClick={onPlainPreviewOpen}
            aria-label="Полноэкранное превью текста (plain)"
            className="flex h-full min-h-12 w-12 shrink-0 cursor-pointer items-center justify-center border-l border-gray-200 px-2 text-gray-800 transition-colors hover:text-accent"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="h-4 w-4 shrink-0"
              aria-hidden
            >
              <path
                d="M22.75 -0.00195312C23.4404 -0.00195313 24 0.55769 24 1.24805V9.99805C24 10.5503 23.5523 10.998 23 10.998C22.4477 10.998 22 10.5503 22 9.99805V3.41211L3.41406 21.998H10C10.5523 21.998 11 22.4458 11 22.998C11 23.5503 10.5523 23.998 10 23.998H1.25C0.559645 23.998 2.41189e-06 23.4384 0 22.748V14.998C0 14.4458 0.447715 13.998 1 13.998C1.55228 13.998 2 14.4458 2 14.998V20.584L20.5859 1.99805H14C13.4477 1.99805 13 1.55033 13 0.998047C13 0.445762 13.4477 -0.00195312 14 -0.00195312H22.75Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </Tooltip>
      </div>
    </>
  );
}
