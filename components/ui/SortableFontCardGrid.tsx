import { useState, type ReactNode } from 'react';
import { SessionFontCard, type SessionFontCardProps } from './SessionFontCard';

export type SortableFontCardGridItem = SessionFontCardProps & {
  id: string;
};

export type SortableFontCardGridProps = {
  items?: SortableFontCardGridItem[];
  onMoveItem?: (sourceId: string, targetId: string) => void;
  gridClassName?: string;
  renderAfter?: ReactNode;
  draggable?: boolean;
};

export function SortableFontCardGrid({
  items = [],
  onMoveItem,
  gridClassName = 'grid max-w-full shrink-0 grid-cols-2 gap-4 pb-6 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5',
  renderAfter = null,
  draggable = true,
}: SortableFontCardGridProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  return (
    <div className={gridClassName}>
      {items.map((item) => {
        const isDragging = draggedId === item.id;
        const isDragOver = dragOverId === item.id && draggedId !== item.id;
        return (
          <SessionFontCard
            key={item.id}
            selected={item.selected}
            batchSelected={item.batchSelected === true}
            title={item.title}
            recentlyAdded={item.recentlyAdded === true}
            subtitle={item.subtitle}
            subtitleParts={item.subtitleParts}
            subtitleLeftParts={item.subtitleLeftParts}
            subtitleRightParts={item.subtitleRightParts}
            subtitleClassName={item.subtitleClassName}
            previewStyle={item.previewStyle}
            onCardClick={item.onCardClick}
            onPointerDown={item.onPointerDown}
            onPointerUp={item.onPointerUp}
            onPointerLeave={item.onPointerLeave}
            onPointerCancel={item.onPointerCancel}
            onRemove={item.onRemove}
            cornerAction={item.cornerAction}
            menuItems={item.menuItems}
            downloadSplitButtonProps={item.downloadSplitButtonProps}
            variant={item.variant}
            previewClassName={item.previewClassName}
            draggable={draggable}
            shellClassName={[
              isDragging ? 'opacity-55' : '',
              isDragOver ? 'ring-2 ring-inset ring-accent' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onDragStart={
              draggable
                ? (event) => {
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', item.id);
                    setDraggedId(item.id);
                  }
                : undefined
            }
            onDragOver={
              draggable
                ? (event) => {
                    event.preventDefault();
                    if (dragOverId !== item.id) {
                      setDragOverId(item.id);
                    }
                  }
                : undefined
            }
            onDrop={
              draggable
                ? (event) => {
                    event.preventDefault();
                    const sourceId = event.dataTransfer.getData('text/plain') || draggedId;
                    if (sourceId && sourceId !== item.id) {
                      onMoveItem?.(sourceId, item.id);
                    }
                    setDraggedId(null);
                    setDragOverId(null);
                  }
                : undefined
            }
            onDragEnd={
              draggable
                ? () => {
                    setDraggedId(null);
                    setDragOverId(null);
                  }
                : undefined
            }
          />
        );
      })}
      {renderAfter}
    </div>
  );
}
