import { useMemo, useState, type ComponentProps, type CSSProperties, type DragEventHandler, type MouseEventHandler, type PointerEventHandler, type ReactNode } from 'react';
import { CatalogFontCard } from '../catalog/CatalogFontCard';
import { CardActionsMenu, type CardActionMenuItem } from './CardActionsMenu';
import { CatalogDownloadSplitButton } from '../catalog/CatalogDownloadSplitButton';
import { Tooltip } from './Tooltip';
import {
  CATALOG_PREVIEW_FONT_SIZE_DEFAULT_PX,
  resolveCatalogGridCardMinHeightPx,
} from '../../utils/catalogPreviewSample';

const PREVIEW_SAMPLE = 'AaBbCcDdEe';

type CatalogDownloadSplitButtonProps = ComponentProps<typeof CatalogDownloadSplitButton>;

function CardRemoveButton({ onClick }: { onClick: MouseEventHandler<HTMLButtonElement> }) {
  return (
    <button
      type="button"
      className="absolute right-2 top-2 text-gray-400 transition-colors hover:text-red-500"
      onClick={onClick}
      aria-label="Удалить из сессии"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

function SelectionOverlay() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden>
          <path
            d="M4.5 10.5L8.25 14.25L15.5 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

function CatalogStyleFooter({
  leftParts = [],
  rightParts = [],
}: {
  leftParts?: ReactNode[];
  rightParts?: ReactNode[];
}) {
  const left = (leftParts || []).filter(Boolean);
  const right = (rightParts || []).filter(Boolean);
  if (!left.length && !right.length) return null;
  return (
    <div className="mt-auto flex w-full min-w-0 flex-wrap items-end justify-between gap-x-2 gap-y-1 pt-1">
      {left.length > 0 ? (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {left.map((part, index) => (
            <span key={`l-${String(part)}-${index}`} className="truncate text-xs font-semibold uppercase text-gray-800">
              {part}
            </span>
          ))}
        </div>
      ) : (
        <span className="min-w-0 shrink" aria-hidden />
      )}
      {right.length > 0 ? (
        <div className="flex shrink-0 items-center justify-end gap-1.5 text-right text-xs font-semibold uppercase tabular-nums leading-snug text-gray-800">
          {right.map((part, index) => (
            <span key={`r-${String(part)}-${index}`} className="whitespace-nowrap">
              {part}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export type SessionFontCardProps = {
  selected?: boolean;
  batchSelected?: boolean;
  title?: string;
  recentlyAdded?: boolean;
  subtitle?: ReactNode;
  subtitleParts?: ReactNode[];
  subtitleLeftParts?: ReactNode[];
  subtitleRightParts?: ReactNode[];
  subtitleClassName?: string;
  previewStyle?: CSSProperties;
  onCardClick?: MouseEventHandler<HTMLDivElement>;
  onPointerDown?: PointerEventHandler<HTMLDivElement>;
  onPointerUp?: PointerEventHandler<HTMLDivElement>;
  onPointerLeave?: PointerEventHandler<HTMLDivElement>;
  onPointerCancel?: PointerEventHandler<HTMLDivElement>;
  onRemove?: () => void;
  cornerAction?: ReactNode;
  menuItems?: CardActionMenuItem[];
  downloadSplitButtonProps?: Omit<CatalogDownloadSplitButtonProps, 'onMenuOpenChange'>;
  variant?: 'default' | 'tall' | 'catalog';
  previewClassName?: string;
  shellClassName?: string;
  draggable?: boolean;
  onDragStart?: DragEventHandler<HTMLDivElement>;
  onDragOver?: DragEventHandler<HTMLDivElement>;
  onDrop?: DragEventHandler<HTMLDivElement>;
  onDragEnd?: DragEventHandler<HTMLDivElement>;
};

/** Карточка шрифта в сессии / библиотеке. variant=catalog — как плитка каталога. */
export function SessionFontCard({
  selected,
  batchSelected = false,
  title,
  recentlyAdded = false,
  subtitle,
  subtitleParts,
  subtitleLeftParts,
  subtitleRightParts,
  subtitleClassName,
  previewStyle,
  onCardClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  onRemove,
  cornerAction,
  menuItems,
  downloadSplitButtonProps,
  variant = 'default',
  previewClassName,
  shellClassName = '',
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: SessionFontCardProps) {
  const [downloadUiOpen, setDownloadUiOpen] = useState(false);

  const catalogMinHeightPx = useMemo(
    () =>
      resolveCatalogGridCardMinHeightPx({
        fontSizePx: CATALOG_PREVIEW_FONT_SIZE_DEFAULT_PX,
        multiline: false,
      }),
    [],
  );

  const footerMeta = useMemo(() => {
    const left = Array.isArray(subtitleLeftParts) ? subtitleLeftParts.filter(Boolean) : [];
    const right = Array.isArray(subtitleRightParts) ? subtitleRightParts.filter(Boolean) : [];
    if (left.length > 0 || right.length > 0) {
      return { left, right };
    }
    const flat = Array.isArray(subtitleParts) ? subtitleParts.filter(Boolean) : [];
    if (flat.length === 0) return { left: [], right: [] };
    return { left: flat, right: [] as ReactNode[] };
  }, [subtitleLeftParts, subtitleParts, subtitleRightParts]);

  if (variant === 'catalog') {
    const previewText = title || PREVIEW_SAMPLE;
    const titleNode = (
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate">{title}</span>
        {recentlyAdded ? (
          <Tooltip content="Добавленный за последние сутки" openDelayMs={150}>
            <span
              className="inline-flex h-2 w-2 shrink-0 rounded-full bg-accent"
              aria-label="Добавленный за последние сутки"
            />
          </Tooltip>
        ) : null}
      </div>
    );

    const topActions =
      !batchSelected && cornerAction ? (
        cornerAction
      ) : !batchSelected && Array.isArray(menuItems) && menuItems.length > 0 ? (
        <CardActionsMenu triggerLabel={`Действия: ${title}`} items={menuItems} />
      ) : null;

    return (
      <div
        className={`group relative min-w-0 ${onCardClick ? 'cursor-pointer' : ''} ${shellClassName}`.trim()}
        onClick={onCardClick}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onPointerCancel={onPointerCancel}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
      >
        <CatalogFontCard
          className={selected && !batchSelected ? 'ring-2 ring-inset ring-accent/35' : ''}
          minHeightClass="h-auto min-w-0"
          rootStyle={{ minHeight: `${catalogMinHeightPx}px` }}
          containIntrinsicHeightPx={catalogMinHeightPx}
          title={titleNode}
          preview={
            <div
              className={
                previewClassName ||
                'mt-2 min-w-0 truncate leading-tight text-gray-800'
              }
              style={{
                ...previewStyle,
                fontSize: `${CATALOG_PREVIEW_FONT_SIZE_DEFAULT_PX}px`,
              }}
            >
              {previewText}
            </div>
          }
          footer={<CatalogStyleFooter leftParts={footerMeta.left} rightParts={footerMeta.right} />}
          actions={topActions}
          selected={batchSelected}
          selectionOverlay={batchSelected ? <SelectionOverlay /> : undefined}
        />
        {!batchSelected && downloadSplitButtonProps ? (
          <div
            className={[
              'absolute bottom-2 right-2 z-[31] max-w-[calc(100%-1rem)] opacity-0 transition-opacity duration-200',
              'pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100',
              'focus-within:pointer-events-auto focus-within:opacity-100',
              downloadUiOpen ? '!pointer-events-auto !opacity-100' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <CatalogDownloadSplitButton
              {...downloadSplitButtonProps}
              onMenuOpenChange={setDownloadUiOpen}
            />
          </div>
        ) : null}
      </div>
    );
  }

  const base =
    `group relative rounded-lg bg-surface-card transition-all min-h-32 duration-200 ${
      onCardClick ? 'cursor-pointer ' : ''
    }` + (batchSelected ? '' : selected ? 'bg-accent-soft' : 'hover:bg-gray-50');

  const shell =
    variant === 'tall'
      ? `${base} flex min-h-[132px] flex-col p-4`
      : `${base} flex h-full flex-col p-4`;

  const previewCls =
    previewClassName ||
    (variant === 'tall' ? 'mt-2 min-h-[1.75rem] truncate text-xl leading-tight' : 'mt-2 truncate');

  const subCls = subtitleClassName || 'mt-auto pt-1 text-xs text-gray-500';

  return (
    <div
      className={`${shell} ${shellClassName}`.trim()}
      onClick={onCardClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerCancel}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className="truncate text-sm font-medium">{title}</div>
        {recentlyAdded ? (
          <Tooltip content="Добавленный за последние сутки" openDelayMs={150}>
            <span
              className="inline-flex h-2 w-2 shrink-0 rounded-full bg-accent"
              aria-label="Добавленный за последние сутки"
            />
          </Tooltip>
        ) : null}
      </div>
      <div className={previewCls} style={previewStyle}>
        {title || PREVIEW_SAMPLE}
      </div>
      {Array.isArray(subtitleParts) && subtitleParts.length > 0 ? (
        <div className={`${subCls} flex flex-wrap items-center gap-2`}>
          {subtitleParts.map((part, index) => (
            <span key={`${String(part)}-${index}`}>{part}</span>
          ))}
        </div>
      ) : (
        <div className={subCls}>{subtitle}</div>
      )}
      {batchSelected ? (
        <>
          <div className="pointer-events-none absolute inset-0 z-20 rounded-lg border-2 border-accent" />
          <div className="pointer-events-none absolute inset-0 z-10 rounded-lg bg-accent/12" />
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <SelectionOverlay />
          </div>
        </>
      ) : null}
      {!batchSelected && cornerAction ? (
        <div className="absolute right-2 top-2 z-[12]">{cornerAction}</div>
      ) : !batchSelected && Array.isArray(menuItems) && menuItems.length > 0 ? (
        <CardActionsMenu triggerLabel={`Действия: ${title}`} items={menuItems} />
      ) : !batchSelected && onRemove ? (
        <CardRemoveButton
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        />
      ) : null}
      {!batchSelected && downloadSplitButtonProps ? (
        <div
          className={[
            'absolute bottom-2 right-2 z-[11] max-w-[calc(100%-1rem)] opacity-0 transition-opacity duration-200',
            'pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100',
            'focus-within:pointer-events-auto focus-within:opacity-100',
            downloadUiOpen ? '!pointer-events-auto !opacity-100' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <CatalogDownloadSplitButton
            {...downloadSplitButtonProps}
            onMenuOpenChange={setDownloadUiOpen}
          />
        </div>
      ) : null}
    </div>
  );
}
