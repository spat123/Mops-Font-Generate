import React from 'react';
import { Tooltip } from './Tooltip';

const EMPTY_PREFIX = 'empty:';

const TAB_ROW = 'h-12 min-h-12';
const BORDER_R = 'border-r border-gray-200';
/** Нижняя граница только у неактивных вкладок */
const INACTIVE_TAB_BOTTOM = 'border-b border-gray-200';

const tabBg = (active) => (active ? 'bg-accent' : 'bg-white');
const tabBottom = (active) => (active ? '' : INACTIVE_TAB_BOTTOM);

const TAB_BASE = `flex min-w-0 shrink-0 items-stretch ${BORDER_R}`;

function tabShellWithClose(active) {
  return `group relative box-border flex ${TAB_ROW} uppercase font-semibold min-w-[8rem] shrink-0 cursor-pointer items-stretch ${BORDER_R} ${tabBg(active)} ${tabBottom(active)}`;
}

const HIT_AREA_BTN =
  'absolute inset-0 z-0 border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/25 focus-visible:ring-offset-0';

const LABEL_CLUSTER_WRAP =
  'pointer-events-none relative z-10 flex h-full w-full min-w-0 items-center justify-center overflow-hidden';

const LABEL_CLUSTER =
  'flex w-max max-w-full min-w-0 flex-nowrap items-center gap-0 transition-[gap] duration-200 ease-out group-hover:gap-1';

function closeBtnClass(onAccent) {
  return [
    'editor-tab-close inline-flex mb-1 h-4 w-0 shrink-0 items-center justify-center overflow-hidden border-0 bg-transparent p-0 text-xl font-light leading-none opacity-0 transition-[width,opacity] duration-200 ease-out',
    'group-hover:w-4 group-hover:opacity-100 group-hover:pointer-events-auto',
    'pointer-events-none focus-visible:pointer-events-auto focus-visible:w-4 focus-visible:opacity-100',
    onAccent ? 'text-white/85 hover:text-white' : 'text-gray-900 hover:text-accent',
  ].join(' ');
}

function labelTextClass(active) {
  return `min-w-0 max-w-full truncate text-center text-xs leading-none ${
    active ? 'text-white' : ' text-gray-900 group-hover:text-accent'
  }`;
}

const LIBRARY_LABEL_BTN = (active) =>
  `flex h-full min-h-0 w-32 min-w-24 flex-1 items-center justify-center bg-transparent text-center text-xs transition-colors ${
    active ? 'font-semibold text-white' : 'font-semibold text-gray-900 hover:text-accent'
  }`;

/** Неинтерактивная вкладка до прихода данных из IndexedDB (тот же силуэт, что у ClosableEditorTab). */
function PlaceholderFontTab({ label, maxWClass }) {
  return (
    <div
      className={`${tabShellWithClose(false)} ${maxWClass} pointer-events-none select-none opacity-75`.trim()}
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
  title,
  ariaTabLabel,
  onSelect,
  onRemove,
  removeAriaLabel,
  maxWClass,
  shellExtraClass = '',
}) {
  return (
    <div className={`${tabShellWithClose(active)} ${maxWClass} ${shellExtraClass}`.trim()}>
      <button type="button" className={HIT_AREA_BTN} onClick={onSelect} aria-label={ariaTabLabel} />
      <div className={LABEL_CLUSTER_WRAP}>
        <div className={LABEL_CLUSTER}>
          <span className={labelTextClass(active)}>{label}</span>
          {typeof onRemove === 'function' && (
            <button
              type="button"
              className={`${closeBtnClass(active)} relative z-20`}
              aria-label={removeAriaLabel}
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
  const libActive = mainTab === 'library';
  const showFontPlaceholders =
    Array.isArray(fontTabPlaceholders) && fontTabPlaceholders.length > 0 && (fonts || []).length === 0;

  return (
    <div
      className={`flex w-full min-w-0 flex-nowrap items-stretch overflow-x-auto overflow-y-hidden bg-white ${TAB_ROW}`}
    >
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
            <PlaceholderFontTab key={row.id} label={row.label} maxWClass="max-w-[15rem] px-6" />
          ))
        : (fonts || []).map((font) => {
            const active = mainTab === font.id;
            const label = font.displayName || font.name;
            return (
              <ClosableEditorTab
                key={font.id}
                active={active}
                label={label}
                title={label}
                ariaTabLabel={`Вкладка шрифта ${label}`}
                onSelect={() => onFontClick(font)}
                onRemove={typeof onRemoveFont === 'function' ? () => onRemoveFont(font.id) : undefined}
                removeAriaLabel={fontTabCloseAriaLabel}
                maxWClass="max-w-[15rem] px-6"
              />
            );
          })}

      {(emptySlotIds || []).map((slotId) => {
        const key = `${EMPTY_PREFIX}${slotId}`;
        const active = mainTab === key;
        return (
          <ClosableEditorTab
            key={slotId}
            active={active}
            label="Новый"
            title="Новый предпросмотр — добавьте шрифт"
            ariaTabLabel="Вкладка «Новый»"
            onSelect={() => onEmptyTabClick(slotId)}
            onRemove={typeof onRemoveEmptySlot === 'function' ? () => onRemoveEmptySlot(slotId) : undefined}
            removeAriaLabel="Закрыть вкладку «Новый»"
            maxWClass="max-w-[11rem]"
          />
        );
      })}

      {showNewTabSsrFallback && <NewTabSsrFallback />}

      <div
        className={`box-border flex ${TAB_ROW} w-12 shrink-0 items-center justify-center ${INACTIVE_TAB_BOTTOM} border-r-0 bg-white`}
      >
        <Tooltip content="Новая пустая вкладка">
          <button
            type="button"
            className="inline-flex shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-1 text-gray-500 transition-colors hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
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
      </div>

      <div
        className={`pointer-events-none flex ${TAB_ROW} min-w-0 flex-1 ${INACTIVE_TAB_BOTTOM} bg-white`}
        aria-hidden
      />

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
