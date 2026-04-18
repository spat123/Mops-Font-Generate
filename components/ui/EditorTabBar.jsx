import React from 'react';

const EMPTY_PREFIX = 'empty:';

const TAB_ROW = 'h-12 min-h-12';
const BORDER_R = 'border-r border-gray-200';
/** Нижняя граница только у неактивных вкладок */
const INACTIVE_TAB_BOTTOM = 'border-b border-gray-200';

const tabBg = (active) => (active ? 'bg-accent' : 'bg-white');
const tabBottom = (active) => (active ? '' : INACTIVE_TAB_BOTTOM);

const TAB_BASE = `flex min-w-0 shrink-0 items-stretch ${BORDER_R}`;

function tabShellWithClose(active) {
  return `group relative box-border flex ${TAB_ROW} min-w-[8rem] shrink-0 cursor-pointer items-stretch ${BORDER_R} ${tabBg(active)} ${tabBottom(active)}`;
}

const HIT_AREA_BTN =
  'absolute inset-0 z-0 border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/25 focus-visible:ring-offset-0';

const LABEL_CLUSTER_WRAP =
  'pointer-events-none relative z-10 flex h-full w-full min-w-0 items-center justify-center overflow-hidden';

const LABEL_CLUSTER =
  'flex w-max max-w-full min-w-0 flex-nowrap items-center gap-0 transition-[gap] duration-200 ease-out group-hover:gap-1';

function closeBtnClass(onAccent) {
  return [
    'editor-tab-close inline-flex h-4 w-0 shrink-0 items-center justify-center overflow-hidden border-0 bg-transparent p-0 text-xs font-medium leading-none opacity-0 transition-[width,opacity] duration-200 ease-out',
    'group-hover:w-4 group-hover:opacity-100 group-hover:pointer-events-auto',
    'pointer-events-none focus-visible:pointer-events-auto focus-visible:w-4 focus-visible:opacity-100',
    onAccent ? 'text-white/85 hover:text-white' : 'text-gray-500 hover:text-accent',
  ].join(' ');
}

function labelTextClass(active) {
  return `min-w-0 max-w-full truncate text-center text-xs leading-none ${
    active ? 'font-semibold text-white' : 'font-medium text-gray-600 group-hover:text-accent'
  }`;
}

const LIBRARY_LABEL_BTN = (active) =>
  `flex h-full min-h-0 w-32 min-w-24 flex-1 items-center justify-center bg-transparent text-center text-xs transition-colors ${
    active ? 'font-semibold text-white' : 'font-medium text-gray-600 hover:text-accent'
  }`;

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
      <button type="button" className={HIT_AREA_BTN} onClick={onSelect} title={title} aria-label={ariaTabLabel} />
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
  onLibraryClick,
  onEmptyTabClick,
  onRemoveEmptySlot,
  onFontClick,
  onRemoveFont,
  onAddEmptySlot,
  /** Подпись для × на вкладке шрифта (закрыть вкладку, не удалять из сессии) */
  fontTabCloseAriaLabel = 'Закрыть вкладку',
}) {
  const libActive = mainTab === 'library';

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
          title="Каталог и список в сессии"
        >
          <span className="min-w-0 truncate">Все шрифты</span>
        </button>
      </div>

      {(fonts || []).map((font) => {
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

      <button
        type="button"
        className={`box-border flex ${TAB_ROW} w-10 shrink-0 items-center justify-center ${INACTIVE_TAB_BOTTOM} border-r-0 bg-white text-xl font-medium leading-none text-gray-900`}
        onClick={onAddEmptySlot}
        title="Новая пустая вкладка"
        aria-label="Добавить вкладку «Новый»"
      >
        +
      </button>
      <div
        className={`pointer-events-none flex ${TAB_ROW} min-w-0 flex-1 ${INACTIVE_TAB_BOTTOM} bg-white`}
        aria-hidden
      />
    </div>
  );
}

export { EMPTY_PREFIX };
