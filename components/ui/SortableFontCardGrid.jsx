import React, { useState } from 'react';
import { SessionFontCard } from './SessionFontCard';

export function SortableFontCardGrid({
  items = [],
  onMoveItem,
  gridClassName = 'grid max-w-full shrink-0 grid-cols-2 gap-4 pb-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  renderAfter = null,
  draggable = true,
}) {
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  return (
    <div className={gridClassName}>
      {items.map((item) => {
        const isDragging = draggedId === item.id;
        const isDragOver = dragOverId === item.id && draggedId !== item.id;
        return (
          <SessionFontCard
            key={item.id}
            selected={item.selected}
            title={item.title}
            subtitle={item.subtitle}
            previewStyle={item.previewStyle}
            onCardClick={item.onCardClick}
            onRemove={item.onRemove}
            menuItems={item.menuItems}
            downloadSplitButtonProps={item.downloadSplitButtonProps}
            variant={item.variant}
            previewClassName={item.previewClassName}
            draggable={draggable}
            shellClassName={[
              isDragging ? 'opacity-55' : '',
              /* ring-inset — внутри карточки, не обрезается overflow-hidden у предков */
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
