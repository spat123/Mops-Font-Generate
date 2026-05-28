import React, { type FocusEvent, type RefObject } from 'react';
import { Tooltip } from '../components/ui/Tooltip';
import { IconCircleButton } from '../components/ui/IconCircleButton';
import { SearchClearButton } from '../components/ui/SearchClearButton';
import { ShareIcon, SearchIcon } from '../components/ui/CommonIcons';

type OpenLibraryShareDialogRef = React.MutableRefObject<
  ((libraryId?: string | null, options?: { onlyFontIds?: string[] }) => void) | undefined
>;

type UseSavedLibrarySearchControlsParams = {
  savedLibrarySearchQuery: string;
  setSavedLibrarySearchQuery: (value: string) => void;
  setIsSavedLibrarySearchExpanded: (value: boolean) => void;
  savedLibrarySearchQueryTrimmed: string;
  savedLibrarySearchActive: boolean;
  savedLibrarySearchWrapRef: RefObject<HTMLDivElement | null>;
  savedLibrarySearchInputRef: RefObject<HTMLInputElement | null>;
  clearSavedLibrarySearch: () => void;
  clearSavedLibrarySearchTextOnly: () => void;
  openSavedLibrarySearch: () => void;
  handleSavedLibrarySearchBlur: (event: FocusEvent<HTMLInputElement>) => void;
  selectedSavedLibraryFontIds: Set<string>;
  openLibraryShareDialogRef: OpenLibraryShareDialogRef;
  savedLibraryToolbarIs5Col: boolean;
};

/**
 * UI поиска и «Поделиться» в тулбаре сохранённой библиотеки.
 */
export function useSavedLibrarySearchControls({
  savedLibrarySearchQuery,
  setSavedLibrarySearchQuery,
  setIsSavedLibrarySearchExpanded,
  savedLibrarySearchQueryTrimmed,
  savedLibrarySearchActive,
  savedLibrarySearchWrapRef,
  savedLibrarySearchInputRef,
  clearSavedLibrarySearch,
  clearSavedLibrarySearchTextOnly,
  openSavedLibrarySearch,
  handleSavedLibrarySearchBlur,
  selectedSavedLibraryFontIds,
  openLibraryShareDialogRef,
  savedLibraryToolbarIs5Col,
}: UseSavedLibrarySearchControlsParams) {
  const savedLibraryShareButton = (
    <Tooltip content="Поделиться">
      <IconCircleButton
        as="button"
        type="button"
        variant="searchToggle"
        size="md"
        className={`focus:outline-none ${
          selectedSavedLibraryFontIds.size > 0
            ? '!bg-accent !text-white hover:!bg-accent-hover [&_svg]:!text-white'
            : ''
        }`}
        aria-label="Поделиться"
        onClick={() => openLibraryShareDialogRef.current?.()}
      >
        <ShareIcon className="h-4 w-4" />
      </IconCircleButton>
    </Tooltip>
  );

  const savedLibrarySearchTooltipText = savedLibrarySearchActive ? 'Закрыть поиск' : 'Открыть поиск';

  const renderSavedLibrarySearchToggleButton = (
    triggerClassName: string,
    onClick: () => void,
    ariaLabel = savedLibrarySearchTooltipText,
    pressed = savedLibrarySearchActive,
  ) => (
    <Tooltip content={savedLibrarySearchTooltipText} className={triggerClassName}>
      <IconCircleButton
        as="button"
        type="button"
        variant="searchToggle"
        size="md"
        pressed={pressed}
        className="focus:outline-none"
        onClick={onClick}
        aria-label={ariaLabel}
      >
        {savedLibrarySearchActive ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            className="h-5 w-5"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <SearchIcon className="h-4 w-4" />
        )}
      </IconCircleButton>
    </Tooltip>
  );

  const savedLibrarySearchField = (
    <div className="relative">
      <input
        ref={savedLibrarySearchInputRef}
        type="search"
        value={savedLibrarySearchQuery}
        onFocus={() => setIsSavedLibrarySearchExpanded(true)}
        onBlur={handleSavedLibrarySearchBlur}
        onChange={(event) => setSavedLibrarySearchQuery(event.target.value)}
        placeholder="Поиск в библиотеке"
        className="box-border h-10 w-full rounded-md border border-transparent bg-gray-50 py-0 pl-2 pr-10 text-sm leading-normal uppercase font-semibold text-gray-900 placeholder:text-gray-900/40 focus:border-black/[0.14] focus:outline-none sm:pl-3"
        autoComplete="off"
        spellCheck={false}
      />
      {savedLibrarySearchQueryTrimmed ? (
        <SearchClearButton
          onClick={clearSavedLibrarySearchTextOnly}
          ariaLabel="Очистить текст поиска"
          className="absolute right-2 top-1/2 -translate-y-1/2"
        />
      ) : null}
    </div>
  );

  const savedLibrarySearchInlineButton = (
    <div className="flex items-center gap-2">
      {renderSavedLibrarySearchToggleButton(
        '',
        savedLibrarySearchActive ? clearSavedLibrarySearch : openSavedLibrarySearch,
      )}
      {savedLibraryShareButton}
    </div>
  );

  const savedLibrarySearchDesktopControls = (
    <div ref={savedLibrarySearchWrapRef} className="relative min-w-0 pr-24">
      <div
        className={`min-w-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] ${
          savedLibrarySearchActive ? 'opacity-100' : 'max-w-0 opacity-0'
        }`}
      >
        {savedLibrarySearchField}
      </div>
      {renderSavedLibrarySearchToggleButton(
        'absolute right-12 top-1/2 z-10 -translate-y-1/2',
        savedLibrarySearchActive ? clearSavedLibrarySearch : openSavedLibrarySearch,
      )}
      <div className="absolute right-0 top-1/2 z-10 -translate-y-1/2">{savedLibraryShareButton}</div>
    </div>
  );

  const savedLibrarySearchMobileExpandedControls = (
    <div
      ref={savedLibrarySearchWrapRef}
      className={`absolute inset-0 z-20 flex min-w-0 items-center transition-opacity duration-200 ${
        savedLibraryToolbarIs5Col ? '' : 'bg-white'
      } ${
        savedLibrarySearchActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="relative min-w-0 flex-1 pr-24">
        {savedLibrarySearchField}
        {renderSavedLibrarySearchToggleButton(
          'absolute right-12 top-1/2 z-10 -translate-y-1/2',
          clearSavedLibrarySearch,
          'Закрыть поиск',
          true,
        )}
        <div className="absolute right-0 top-1/2 z-10 -translate-y-1/2">{savedLibraryShareButton}</div>
      </div>
    </div>
  );

  return {
    savedLibraryShareButton,
    renderSavedLibrarySearchToggleButton,
    savedLibrarySearchInlineButton,
    savedLibrarySearchDesktopControls,
    savedLibrarySearchMobileExpandedControls,
  };
}
