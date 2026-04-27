import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Tooltip } from './Tooltip';

const EMPTY_PREFIX = 'empty:';

const TAB_ROW = 'h-12 min-h-12';
const BORDER_R = 'border-r border-gray-200';
/** Нижняя граница только у неактивных вкладок */
const INACTIVE_TAB_BOTTOM = 'border-b border-gray-200';

const tabBg = (active) => (active ? 'bg-accent' : 'bg-white');
const tabBottom = (active) => (active ? '' : INACTIVE_TAB_BOTTOM);

const TAB_BASE = `flex min-w-0 shrink-0 items-stretch ${BORDER_R}`;

function tabShellWithClose(active, minWClass = 'min-w-[8rem]') {
  return `group relative box-border flex ${TAB_ROW} uppercase font-semibold ${minWClass} shrink-0 cursor-pointer items-stretch ${BORDER_R} ${tabBg(active)} ${tabBottom(active)}`;
}

const HIT_AREA_BTN =
  'absolute inset-0 z-0 border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/25 focus-visible:ring-offset-0';

const LABEL_CLUSTER_WRAP =
  'pointer-events-none relative z-10 flex h-full w-full min-w-0 items-center justify-center overflow-hidden';

const LABEL_CLUSTER = 'flex w-full max-w-full min-w-0 items-center justify-center gap-1';

function getFontTabSourceMeta(source) {
  if (source === 'google') return { shortLabel: 'G', fullLabel: 'Google' };
  if (source === 'fontsource') return { shortLabel: 'FS', fullLabel: 'Fontsource' };
  if (source === 'local') return { shortLabel: 'L', fullLabel: 'Локальный' };
  return null;
}

function getCloseButtonMode(totalTabCount) {
  if (totalTabCount >= 9) return 'active-always';
  if (totalTabCount >= 6) return 'active-hover';
  return 'all-hover';
}

function closeBtnClass(onAccent, mode = 'all-hover') {
  if (mode === 'active-always') {
    if (!onAccent) {
      return [
        'editor-tab-close inline-flex mb-1 h-4 w-0 shrink-0 items-center justify-center overflow-hidden border-0 bg-transparent p-0 text-xl font-light leading-none opacity-0 pointer-events-none',
        'text-gray-900',
      ].join(' ');
    }
    return [
      'editor-tab-close inline-flex mb-1 h-4 w-4 shrink-0 items-center justify-center overflow-hidden border-0 bg-transparent p-0 text-xl font-light leading-none opacity-100 pointer-events-auto',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/35',
      'text-white/85 hover:text-white',
    ].join(' ');
  }

  if (mode === 'active-hover') {
    if (!onAccent) {
      return [
        'editor-tab-close inline-flex mb-1 h-4 w-0 shrink-0 items-center justify-center overflow-hidden border-0 bg-transparent p-0 text-xl font-light leading-none opacity-0 pointer-events-none',
        'text-gray-900',
      ].join(' ');
    }
    return [
      'editor-tab-close inline-flex mb-1 h-4 w-0 shrink-0 items-center justify-center overflow-hidden border-0 bg-transparent p-0 text-xl font-light leading-none opacity-0 transition-[width,opacity] duration-200 ease-out',
      'group-hover:w-4 group-hover:opacity-100 group-hover:pointer-events-auto',
      'pointer-events-none focus-visible:pointer-events-auto focus-visible:w-4 focus-visible:opacity-100',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/35',
      'text-white/85 hover:text-white',
    ].join(' ');
  }

  return [
    'editor-tab-close inline-flex mb-1 h-4 w-0 shrink-0 items-center justify-center overflow-hidden border-0 bg-transparent p-0 text-xl font-light leading-none opacity-0 transition-[width,opacity] duration-200 ease-out',
    'group-hover:w-4 group-hover:opacity-100 group-hover:pointer-events-auto',
    'pointer-events-none focus-visible:pointer-events-auto focus-visible:w-4 focus-visible:opacity-100',
    onAccent ? 'focus-visible:ring-white/35 text-white/85 hover:text-white' : 'focus-visible:ring-black/15 text-gray-900 hover:text-accent',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset',
  ].join(' ');
}

function shouldHideCloseButtonFromA11y(active, mode = 'all-hover') {
  if (mode === 'all-hover') return false;
  return !active;
}

function closeButtonTabIndex(active, mode = 'all-hover') {
  if (mode === 'all-hover') return 0;
  return active ? 0 : -1;
}

function labelTextClass(active) {
  return `min-w-0 flex-1 truncate text-center text-xs leading-none ${
    active ? 'text-white' : ' text-gray-900 group-hover:text-accent'
  }`;
}

function sourceBadgeClass(active) {
  return [
    'inline-flex shrink-0 items-center justify-center rounded-sm px-1 py-0.5 text-[9px] font-semibold leading-none tracking-[0.02em]',
    active ? 'bg-white/18 text-white/90' : 'bg-gray-100 text-gray-500 group-hover:bg-accent/10 group-hover:text-accent',
  ].join(' ');
}

function getTabDensityClasses(totalTabCount) {
  if (totalTabCount >= 9) {
    return {
      tabWidthClass: 'w-[8rem]',
      tabMinWidthClass: 'min-w-[7rem]',
      tabMaxWidthClass: 'max-w-[10.5rem] px-3',
      placeholderWidthClass: 'w-[8rem]',
      placeholderMinWidthClass: 'min-w-[7rem]',
      placeholderMaxWidthClass: 'max-w-[10.5rem] px-3',
    };
  }
  if (totalTabCount >= 6) {
    return {
      tabWidthClass: 'w-[9.25rem]',
      tabMinWidthClass: 'min-w-[7.5rem]',
      tabMaxWidthClass: 'max-w-[11.5rem] px-3.5',
      placeholderWidthClass: 'w-[9.25rem]',
      placeholderMinWidthClass: 'min-w-[7.5rem]',
      placeholderMaxWidthClass: 'max-w-[11.5rem] px-3.5',
    };
  }
  return {
    tabWidthClass: 'w-[10.75rem]',
    tabMinWidthClass: 'min-w-[8rem]',
    tabMaxWidthClass: 'max-w-[13rem] px-4',
    placeholderWidthClass: 'w-[10.75rem]',
    placeholderMinWidthClass: 'min-w-[8rem]',
    placeholderMaxWidthClass: 'max-w-[13rem] px-4',
  };
}

function scrollArrowButtonClass(disabled = false) {
  return [
    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-0 transition-colors',
    disabled
      ? 'cursor-default text-gray-300'
      : 'text-gray-800 hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
  ].join(' ');
}

function ScrollArrowIcon({ direction = 'left' }) {
  const isLeft = direction === 'left';
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className="h-4 w-4 shrink-0"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={isLeft ? 'M14.5 5.5 8 12l6.5 6.5' : 'm9.5 5.5 6.5 6.5-6.5 6.5'}
      />
    </svg>
  );
}

const LIBRARY_LABEL_BTN = (active) =>
  `flex h-full min-h-0 w-32 min-w-24 flex-1 items-center justify-center bg-transparent text-center text-xs transition-colors ${
    active ? 'font-semibold text-white' : 'font-semibold text-gray-900 hover:text-accent'
  }`;

/** Неинтерактивная вкладка до прихода данных из IndexedDB (тот же силуэт, что у ClosableEditorTab). */
function PlaceholderFontTab({ label, widthClass, minWClass, maxWClass }) {
  return (
    <div
      className={`${tabShellWithClose(false, minWClass)} ${widthClass} ${maxWClass} pointer-events-none select-none opacity-75`.trim()}
      aria-hidden="true"
    >
      <div className={LABEL_CLUSTER_WRAP}>
        <div className={LABEL_CLUSTER}>
          <span className="min-w-0 max-w-full truncate text-center text-xs font-medium leading-none text-gray-400">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

function NewTabSsrFallback() {
  return (
    <div
      className={`${tabShellWithClose(false)} max-w-[11rem] editor-new-ssr-fallback`.trim()}
      aria-hidden="true"
    >
      <div className={LABEL_CLUSTER_WRAP}>
        <div className={LABEL_CLUSTER}>
          <span className="min-w-0 max-w-full truncate text-center text-xs font-medium leading-none text-gray-500">
            Новый
          </span>
        </div>
      </div>
    </div>
  );
}

/** Вкладка с полноразмерным hit-area и опциональным × */
function ClosableEditorTab({
  active,
  label,
  sourceBadge = null,
  title,
  ariaTabLabel,
  onSelect,
  onRemove,
  removeAriaLabel,
  widthClass = 'w-[10.75rem]',
  minWClass = 'min-w-[8rem]',
  maxWClass,
  closeButtonMode = 'all-hover',
  shellExtraClass = '',
}) {
  return (
    <div
      className={`${tabShellWithClose(active, minWClass)} ${widthClass} ${maxWClass} ${shellExtraClass}`.trim()}
      title={title}
    >
      <button type="button" className={HIT_AREA_BTN} onClick={onSelect} aria-label={ariaTabLabel} />
      <div className={LABEL_CLUSTER_WRAP}>
        <div className={LABEL_CLUSTER}>
          {sourceBadge ? (
            <span className={sourceBadgeClass(active)} title={sourceBadge.fullLabel} aria-hidden="true">
              {sourceBadge.shortLabel}
            </span>
          ) : null}
          <span className={labelTextClass(active)}>{label}</span>
          {typeof onRemove === 'function' && (
            <button
              type="button"
              className={`${closeBtnClass(active, closeButtonMode)} relative z-20`}
              aria-label={removeAriaLabel}
              tabIndex={closeButtonTabIndex(active, closeButtonMode)}
              aria-hidden={shouldHideCloseButtonFromA11y(active, closeButtonMode) ? 'true' : undefined}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Порядок: «Все шрифты» · шрифты · «Новый» (пустые) · [+]
 * Вкладки с крестиком: по hover текст смещается влево, × рядом (без отдельного фона у ×).
 */
export function EditorTabBar({
  mainTab,
  emptySlotIds,
  emptySlotLabelsById = {},
  fonts,
  /** Пока fonts пуст: id + label из sessionStorage с прошлого визита */
  fontTabPlaceholders = null,
  /** SSR/первый кадр: показать вкладку «Новый», пока shell не восстановлен (для новых пользователей). */
  showNewTabSsrFallback = false,
  onLibraryClick,
  onEmptyTabClick,
  onRemoveEmptySlot,
  onFontClick,
  onRemoveFont,
  onAddEmptySlot,
  /** Подпись для × на вкладке шрифта (закрыть вкладку, не удалять из сессии) */
  fontTabCloseAriaLabel = 'Закрыть вкладку',
  /** Справа от вкладок: экспорт / генерация и т.п. (видно при открытой вкладке шрифта) */
  endActions = null,
}) {
  const scrollRef = useRef(null);
  const [scrollState, setScrollState] = useState({ left: false, right: false });
  const libActive = mainTab === 'library';
  const showFontPlaceholders =
    Array.isArray(fontTabPlaceholders) && fontTabPlaceholders.length > 0 && (fonts || []).length === 0;
  const hasHorizontalOverflow = scrollState.left || scrollState.right;
  const totalTabCount = (fonts || []).length + (emptySlotIds || []).length;
  const closeButtonMode = getCloseButtonMode(totalTabCount);
  const {
    tabWidthClass,
    tabMinWidthClass,
    tabMaxWidthClass,
    placeholderWidthClass,
    placeholderMinWidthClass,
    placeholderMaxWidthClass,
  } = getTabDensityClasses(totalTabCount);

  const updateScrollState = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    const maxScrollLeft = Math.max(0, node.scrollWidth - node.clientWidth);
    setScrollState({
      left: node.scrollLeft > 4,
      right: node.scrollLeft < maxScrollLeft - 4,
    });
  }, []);

  useEffect(() => {
    updateScrollState();
    const node = scrollRef.current;
    if (!node) return undefined;

    const handleScroll = () => updateScrollState();
    const handleResize = () => updateScrollState();

    node.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateScrollState());
      resizeObserver.observe(node);
      const track = node.firstElementChild;
      if (track) resizeObserver.observe(track);
    }

    return () => {
      node.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
    };
  }, [fonts, emptySlotIds, endActions, fontTabPlaceholders, showNewTabSsrFallback, updateScrollState]);

  const scrollTabsBy = useCallback((direction) => {
    const node = scrollRef.current;
    if (!node) return;
    const offset = Math.max(160, Math.round(node.clientWidth * 0.45));
    node.scrollBy({ left: direction === 'left' ? -offset : offset, behavior: 'smooth' });
  }, []);

  const addNewTabButton = (
    <Tooltip content="Новая пустая вкладка">
      <button
        type="button"
        className="inline-flex shrink-0 items-center w-8 justify-center rounded-md border-0 bg-transparent p-1 text-gray-800 transition-colors hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        onClick={onAddEmptySlot}
        aria-label="Добавить вкладку «Новый»"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-4 w-4 shrink-0"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
    </Tooltip>
  );

  return (
    <div className={`flex w-full min-w-0 items-stretch bg-white ${TAB_ROW}`}>
      {scrollState.left && (
        <div className={`flex shrink-0 items-center bg-white ${TAB_ROW} ${INACTIVE_TAB_BOTTOM}`}>
          <button
            type="button"
            className={scrollArrowButtonClass(false)}
            onClick={() => scrollTabsBy('left')}
            aria-label="Прокрутить вкладки влево"
          >
            <ScrollArrowIcon direction="left" />
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className={`editor-tabbar-scroll min-w-0 flex-1 overflow-x-auto overflow-y-hidden ${TAB_ROW}`}
      >
        <div className={`flex min-w-full items-stretch ${TAB_ROW}`}>
          <div
            className={`${tabBg(libActive)} ${TAB_BASE} ${TAB_ROW} box-border max-w-[13rem] ${tabBottom(libActive)}`}
          >
            <button
              type="button"
              className={LIBRARY_LABEL_BTN(libActive)}
              onClick={onLibraryClick}
            >
              <span className="min-w-0 truncate uppercase font-semibold">Все шрифты</span>
            </button>
          </div>

          {showFontPlaceholders
            ? fontTabPlaceholders.map((row) => (
                <PlaceholderFontTab
                  key={row.id}
                  label={row.label}
                  widthClass={placeholderWidthClass}
                  minWClass={placeholderMinWidthClass}
                  maxWClass={placeholderMaxWidthClass}
                />
              ))
            : (fonts || []).map((font) => {
                const active = mainTab === font.id;
                const label = font.displayName || font.name;
                const sourceBadge = getFontTabSourceMeta(font.source);
                const sourceLabel = sourceBadge?.fullLabel ? ` (${sourceBadge.fullLabel})` : '';
                return (
                  <ClosableEditorTab
                    key={font.id}
                    active={active}
                    label={label}
                    sourceBadge={sourceBadge}
                    title={label}
                    ariaTabLabel={`Вкладка шрифта ${label}${sourceLabel}`}
                    onSelect={() => onFontClick(font)}
                    onRemove={typeof onRemoveFont === 'function' ? () => onRemoveFont(font.id) : undefined}
                    removeAriaLabel={fontTabCloseAriaLabel}
                    widthClass={tabWidthClass}
                    minWClass={tabMinWidthClass}
                    maxWClass={tabMaxWidthClass}
                    closeButtonMode={closeButtonMode}
                  />
                );
              })}

          {(emptySlotIds || []).map((slotId) => {
            const key = `${EMPTY_PREFIX}${slotId}`;
            const active = mainTab === key;
            const customLabel = String(emptySlotLabelsById?.[slotId] || '').trim();
            const label = customLabel || 'Новый';
            const title = customLabel ? customLabel : 'Новый предпросмотр — добавьте шрифт';
            return (
              <ClosableEditorTab
                key={slotId}
                active={active}
                label={label}
                title={title}
                ariaTabLabel={customLabel ? `Вкладка шрифта ${customLabel}` : 'Вкладка «Новый»'}
                onSelect={() => onEmptyTabClick(slotId)}
                onRemove={typeof onRemoveEmptySlot === 'function' ? () => onRemoveEmptySlot(slotId) : undefined}
                removeAriaLabel={
                  customLabel ? `Закрыть вкладку шрифта ${customLabel}` : 'Закрыть вкладку «Новый»'
                }
                widthClass={tabWidthClass}
                minWClass={tabMinWidthClass}
                maxWClass={tabMaxWidthClass}
                closeButtonMode={closeButtonMode}
              />
            );
          })}

          {showNewTabSsrFallback && <NewTabSsrFallback />}

          {!hasHorizontalOverflow ? (
            <div
              className={`box-border flex ${TAB_ROW} w-12 shrink-0 items-center justify-center ${INACTIVE_TAB_BOTTOM} border-r-0 bg-white`}
            >
              {addNewTabButton}
            </div>
          ) : null}

          <div
            className={`pointer-events-none flex ${TAB_ROW} min-w-0 flex-1 ${INACTIVE_TAB_BOTTOM} bg-white`}
            aria-hidden
          />
        </div>
      </div>

      {hasHorizontalOverflow ? (
        <div className={`flex shrink-0 items-center bg-white ${TAB_ROW} ${INACTIVE_TAB_BOTTOM}`}>
          {scrollState.right ? (
            <button
              type="button"
              className={scrollArrowButtonClass(false)}
              onClick={() => scrollTabsBy('right')}
              aria-label="Прокрутить вкладки вправо"
            >
              <ScrollArrowIcon direction="right" />
            </button>
          ) : null}
          {addNewTabButton}
        </div>
      ) : null}

      {endActions != null && endActions !== false && (
        <div
          className={`flex shrink-0 items-center justify-end gap-3 bg-white pl-3 ${TAB_ROW} ${INACTIVE_TAB_BOTTOM}`}
        >
          {endActions}
        </div>
      )}
    </div>
  );
}

export { EMPTY_PREFIX };
