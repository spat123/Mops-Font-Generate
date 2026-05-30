import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { CatalogFontCard } from './CatalogFontCard';
import { CatalogRowHeader } from './CatalogRowHeader';
import { Tooltip } from '../ui/Tooltip';

const ROW_TOOLTIP = 'Дважды нажмите, чтобы изменить образец для всех строк в этом режиме';

/** Для virtual scroll в каталоге — меняйте вместе с DEFAULT_ROW_MIN_HEIGHT */
export const CATALOG_ROW_MODE_ESTIMATED_HEIGHT_PX = 240;

// Важно: высота ROW должна применяться одинаково в Google (virtualized) и Fontsource (обычный список).
// Tailwind-классами с динамическими значениями легко промахнуться, поэтому фиксируем высоту inline style.
const DEFAULT_ROW_MIN_HEIGHT = 'min-w-0';

export type CatalogRowModeCardProps = {
  family?: string;
  familyNode?: ReactNode;
  metaItems?: string[];
  minHeightClass?: string;
  rowHeightPx?: number;
  previewFamily?: string;
  previewText?: string;
  defaultPreviewText?: string;
  onGlobalRowSampleCommit?: (text: string) => void;
  previewAlign?: 'end' | 'start';
  rowSampleTooltip?: ReactNode;
  rowPreviewEditorAriaLabel?: string;
  pinPreviewColumnClassName?: string;
  previewProps?: { className?: string; style?: CSSProperties } & Record<string, unknown>;
  selected?: boolean;
  busy?: boolean;
  actions?: ReactNode;
  selectionOverlay?: ReactNode;
  hoverOverlay?: ReactNode;
  onClick?: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerLeave?: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerCancel?: (event: PointerEvent<HTMLDivElement>) => void;
  draggable?: boolean;
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (event: DragEvent<HTMLDivElement>) => void;
  shareSurface?: boolean;
};

export function CatalogRowModeCard({
  family,
  familyNode = null,
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
  /** Выравнивание крупного образца в ROW: `end` — как в каталоге (справа внизу), `start` — слева внизу */
  previewAlign = 'end',
  /** Подсказка при редактируемом образце (двойной клик) */
  rowSampleTooltip,
  /** `aria-label` для поля правки образца */
  rowPreviewEditorAriaLabel,
  pinPreviewColumnClassName = '',
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
  /** Страница «Поделиться»: мета справа, без accent-hover на строке */
  shareSurface = false,
}: CatalogRowModeCardProps) {
  const resolvedRowHeightPx = Math.max(24, Number(rowHeightPx) || CATALOG_ROW_MODE_ESTIMATED_HEIGHT_PX);
  const resolvedPreviewProps = previewProps && typeof previewProps === 'object' ? previewProps : {};
  const { className: previewClassName = '', style: previewInlineStyle = undefined } = resolvedPreviewProps;

  const [editingPreview, setEditingPreview] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const skipCommitOnBlurRef = useRef(false);
  const didOpenEditorRef = useRef(false);
  const snapshotAtEditStartRef = useRef('');

  const canEditPreview = typeof onGlobalRowSampleCommit === 'function';
  const isStart = previewAlign === 'start';
  const alignRowClass = isStart ? 'items-start justify-end' : 'items-end justify-end';
  const tooltipContent = rowSampleTooltip ?? ROW_TOOLTIP;
  const editorAria = rowPreviewEditorAriaLabel ?? 'Образец текста для всех строк каталога';
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

  const normalizeRowEditorText = useCallback((value) => {
    return String(value ?? '')
      .replace(/\u00a0/g, ' ')
      .trim();
  }, []);

  const finishPreviewEdit = useCallback(() => {
    if (!canEditPreview) return;
    const raw = editorRef.current?.textContent ?? '';
    const trimmed = normalizeRowEditorText(raw);
    const snapshotNorm = normalizeRowEditorText(snapshotAtEditStartRef.current);
    if (trimmed === snapshotNorm) {
      setEditingPreview(false);
      return;
    }
    onGlobalRowSampleCommit(trimmed);
    setEditingPreview(false);
  }, [canEditPreview, normalizeRowEditorText, onGlobalRowSampleCommit]);

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

  const rowPreviewTypographyClass =
    'text-[clamp(3.5rem,6vw,5rem)] leading-[0.95] whitespace-nowrap pb-1';
  const rowPreviewColorClass = selected
    ? 'text-gray-800'
    : editingPreview
      ? '!text-white caret-white'
      : 'text-gray-800 group-hover:!text-white group-data-[catalog-hover-ui=true]:!text-white group-focus-within:!text-white group-hover:caret-white group-focus-within:caret-white';

  const previewShellClass = [
    `mt-1 flex min-h-0 min-w-0 w-fit max-w-full items-end overflow-visible ${rowPreviewTypographyClass} ${rowPreviewColorClass}`,
    canEditPreview ? 'cursor-text' : '',
    previewClassName,
  ]
    .filter(Boolean)
    .join(' ');

  const previewInner = (
    <div
      className={previewShellClass}
      style={previewStyle}
      onPointerDown={(e) => canEditPreview && e.stopPropagation()}
      onDoubleClick={canEditPreview ? openEditor : undefined}
    >
      {previewText}
    </div>
  );

  const previewReadOnly = canEditPreview ? (
    isStart ? (
      <div className={`flex min-h-0 w-full min-w-0 flex-1 flex-col ${alignRowClass}`}>
        <Tooltip content={tooltipContent} as="div" className="inline-flex w-fit min-w-0 max-w-full">
          {previewInner}
        </Tooltip>
      </div>
    ) : (
      <Tooltip content={tooltipContent} as="div" className="inline-flex w-fit min-w-0 max-w-full">
        {previewInner}
      </Tooltip>
    )
  ) : (
    <div className={`flex min-h-0 w-full min-w-0 flex-1 flex-col ${alignRowClass}`}>{previewInner}</div>
  );

  const previewEditingBlock = (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={editorAria}
      spellCheck={false}
      className={[
        `mt-1 inline-block min-h-0 min-w-0 w-fit max-w-full overflow-visible outline-none border-none ring-0 bg-transparent ${rowPreviewTypographyClass} ${rowPreviewColorClass}`,
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

  const previewEditingInline = isStart ? (
    <div className={`flex min-h-0 w-full min-w-0 flex-1 flex-col ${alignRowClass}`}>{previewEditingBlock}</div>
  ) : (
    previewEditingBlock
  );

  const previewContent = editingPreview ? previewEditingInline : previewReadOnly;

  const rowDividerClass = shareSurface ? 'border-gray-200' : 'border-gray-300';
  const rowCardClassName = [
    'rounded-none h-full min-h-0 bg-white',
    `border-0 border-b ${rowDividerClass}`,
    shareSurface || selected
      ? ''
      : `hover:!bg-accent hover:!border-b-accent${canEditPreview ? ' focus-within:!bg-accent focus-within:!border-b-accent' : ''}`,
  ]
    .filter(Boolean)
    .join(' ');

  const headerFamilyClassName = `min-w-0 max-w-full truncate text-left text-xs font-medium leading-tight text-gray-800 ${
    selected ? '' : 'group-hover:!text-white group-data-[catalog-hover-ui=true]:!text-white'
  } sm:text-sm`;

  const headerMetaClassName = shareSurface
    ? `text-sm font-semibold uppercase leading-tight text-gray-900 ${selected ? '' : 'group-hover:!text-white group-data-[catalog-hover-ui=true]:!text-white'}`
    : `flex min-w-0 w-full max-w-full flex-nowrap items-center justify-start gap-x-2 text-left text-sm font-semibold uppercase leading-tight text-black xl:w-[min(100%,44rem)] xl:justify-self-center ${
        selected ? '' : 'group-hover:!text-white group-data-[catalog-hover-ui=true]:!text-white'
      } sm:gap-x-3`;

  return (
    <div
      className={`relative w-full min-w-0 ${minHeightClass}`.trim()}
      style={{ height: `${resolvedRowHeightPx}px`, minHeight: `${resolvedRowHeightPx}px` }}
    >
      <div className="h-full min-h-0">
        <CatalogFontCard
          className={rowCardClassName}
          hoverSurface={shareSurface ? 'neutral' : 'accent'}
          minHeightClass=""
          pinPreviewToBottom
          pinPreviewColumnClassName={pinPreviewColumnClassName}
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
              family={(typeof familyNode === 'string' ? familyNode : family) || ''}
              metaItems={metaItems}
              familyClassName={headerFamilyClassName}
              metaClassName={headerMetaClassName}
              metaTrailingEdge={Boolean(shareSurface)}
            />
          }
          titleClassName="w-full"
          preview={previewContent}
        />
      </div>
    </div>
  );
}
