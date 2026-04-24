import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { CatalogFontCard } from './CatalogFontCard';
import { CatalogRowHeader } from './CatalogRowHeader';
import { Tooltip } from './Tooltip';

const ROW_TOOLTIP = 'Дважды нажмите, чтобы изменить образец для всех строк в этом режиме';

/** Для virtual scroll в каталоге — меняйте вместе с DEFAULT_ROW_MIN_HEIGHT */
export const CATALOG_ROW_MODE_ESTIMATED_HEIGHT_PX = 240;

// Важно: высота ROW должна применяться одинаково в Google (virtualized) и Fontsource (обычный список).
// Tailwind-классами с динамическими значениями легко промахнуться, поэтому фиксируем высоту inline style.
const DEFAULT_ROW_MIN_HEIGHT = 'min-w-0';

export function CatalogRowModeCard({
  family,
  metaItems = [],
  /** Высота строки ROW — одна строка классов Tailwind; меняйте здесь, не дублируйте снаружи */
  minHeightClass = DEFAULT_ROW_MIN_HEIGHT,
  /** Высота строки ROW в px; по умолчанию из CATALOG_ROW_MODE_ESTIMATED_HEIGHT_PX */
  rowHeightPx = CATALOG_ROW_MODE_ESTIMATED_HEIGHT_PX,
  previewFamily,
  previewText,
  /** Базовая подпись строки (имя семейства), если глобальный образец сброшен */
  defaultPreviewText,
  /** Сохранить глобальный образец для всех ROW-карточек; пустая строка — сброс (у каждой строки снова имя семейства) */
  onGlobalRowSampleCommit,
  previewProps = undefined,
  selected = false,
  busy = false,
  actions = null,
  selectionOverlay = null,
  hoverOverlay = null,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  draggable = false,
  onDragStart,
  onDragEnd,
}) {
  const resolvedRowHeightPx = Math.max(24, Number(rowHeightPx) || CATALOG_ROW_MODE_ESTIMATED_HEIGHT_PX);
  const resolvedPreviewProps = previewProps && typeof previewProps === 'object' ? previewProps : {};
  const {
    className: previewClassName = '',
    style: previewInlineStyle = undefined,
    ...restPreviewProps
  } = resolvedPreviewProps;

  const [editingPreview, setEditingPreview] = useState(false);
  const editorRef = useRef(null);
  const skipCommitOnBlurRef = useRef(false);
  const didOpenEditorRef = useRef(false);
  const snapshotAtEditStartRef = useRef('');

  const canEditPreview = typeof onGlobalRowSampleCommit === 'function';
  const resolvedDefault = (defaultPreviewText ?? previewText ?? family ?? '').trim() || family;
  const previewStyle = {
    ...(previewInlineStyle && typeof previewInlineStyle === 'object' ? previewInlineStyle : {}),
    ...(previewFamily ? { fontFamily: previewFamily } : {}),
  };

  useLayoutEffect(() => {
    if (!editingPreview) {
      didOpenEditorRef.current = false;
      return;
    }
    if (didOpenEditorRef.current) return;
    const el = editorRef.current;
    if (!el) return;
    didOpenEditorRef.current = true;
    el.textContent = snapshotAtEditStartRef.current;
    el.focus();
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    } catch {
      /* ignore */
    }
  }, [editingPreview]);

  const finishPreviewEdit = useCallback(() => {
    if (!canEditPreview) return;
    const raw = editorRef.current?.textContent ?? '';
    const normalized = raw.replace(/\u00a0/g, ' ');
    const trimmed = normalized.trim();
    onGlobalRowSampleCommit(trimmed);
    setEditingPreview(false);
  }, [canEditPreview, onGlobalRowSampleCommit]);

  const handlePreviewBlur = useCallback(() => {
    if (skipCommitOnBlurRef.current) {
      skipCommitOnBlurRef.current = false;
      setEditingPreview(false);
      return;
    }
    finishPreviewEdit();
  }, [finishPreviewEdit]);

  const handlePreviewKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        skipCommitOnBlurRef.current = true;
        if (editorRef.current) {
          editorRef.current.textContent = snapshotAtEditStartRef.current;
        }
        editorRef.current?.blur();
        return;
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        editorRef.current?.blur();
      }
    },
    [],
  );

  const openEditor = useCallback(
    (event) => {
      if (!canEditPreview) return;
      event.stopPropagation();
      snapshotAtEditStartRef.current = previewText ?? resolvedDefault;
      setEditingPreview(true);
    },
    [canEditPreview, previewText, resolvedDefault],
  );

  const previewShellClass = [
    `mt-1 flex min-h-0 min-w-0 w-fit max-w-full items-end overflow-visible whitespace-nowrap pb-1 text-[clamp(3.5rem,6vw,5rem)] leading-[0.95] text-gray-800 ${
      selected ? '' : 'group-hover:!text-white'
    }`,
    canEditPreview ? 'cursor-text' : '',
    previewClassName,
  ]
    .filter(Boolean)
    .join(' ');

  const previewInner = (
    <div
      {...restPreviewProps}
      className={previewShellClass}
      style={previewStyle}
      onPointerDown={(e) => canEditPreview && e.stopPropagation()}
      onDoubleClick={canEditPreview ? openEditor : undefined}
    >
      {previewText}
    </div>
  );

  const previewReadOnly = canEditPreview ? (
    <Tooltip content={ROW_TOOLTIP} as="div" className="inline-flex w-fit min-w-0 max-w-full">
      {previewInner}
    </Tooltip>
  ) : (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col items-end justify-end">{previewInner}</div>
  );

  const previewEditingInline = (
    <div
      {...restPreviewProps}
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label="Образец текста для всех строк каталога"
      spellCheck={false}
      className={[
        'mt-1 inline-block min-h-0 min-w-0 w-fit max-w-full overflow-visible whitespace-nowrap pb-1 text-[clamp(3.5rem,6vw,5rem)] leading-[0.95] text-gray-900 caret-current outline-none border-none ring-0 bg-transparent',
        previewClassName,
      ]
        .filter(Boolean)
        .join(' ')}
      style={previewStyle}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onBlur={handlePreviewBlur}
      onKeyDown={handlePreviewKeyDown}
    />
  );

  const previewContent = editingPreview ? previewEditingInline : previewReadOnly;

  return (
    <div
      className={`relative w-full min-w-0 ${minHeightClass}`.trim()}
      style={{ height: `${resolvedRowHeightPx}px`, minHeight: `${resolvedRowHeightPx}px` }}
    >
      <div className="h-full min-h-0">
        <CatalogFontCard
          className={`rounded-none h-full min-h-0 border-b border-gray-300 bg-white ${
            selected ? '' : 'hover:!bg-accent hover:border-accent'
          }`}
          minHeightClass=""
          pinPreviewToBottom
          selected={selected}
          busy={busy}
          actions={actions}
          selectionOverlay={selectionOverlay}
          hoverOverlay={hoverOverlay}
          onClick={onClick}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerLeave}
          onPointerCancel={onPointerCancel}
          draggable={draggable}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          title={
            <CatalogRowHeader
              family={family}
              metaItems={metaItems}
              familyClassName={`min-w-0 max-w-full truncate text-left text-xs font-medium leading-tight text-gray-800 ${
                selected ? '' : 'group-hover:!text-white'
              } sm:text-sm`}
              metaClassName={`flex min-w-0 w-[min(100%,44rem)] flex-nowrap items-center justify-start gap-x-2 text-left text-sm font-semibold uppercase leading-tight text-black ${
                selected ? '' : 'group-hover:!text-white'
              } sm:gap-x-3`}
            />
          }
          titleClassName="w-full"
          preview={previewContent}
        />
      </div>
    </div>
  );
}
