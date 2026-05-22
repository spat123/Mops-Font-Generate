import React from 'react';

/**
 * Кастомная полоса прокрутки поверх области с классом `.catalog-scroll-area`
 * (нативная полоса скрыта в CSS). Поддерживает перетаскивание ползунка и клик по дорожке.
 */
export function OverlayScrollbar({
  overlayThumb,
  scrollbarVisible,
  isDragging,
  onTrackPointerDown,
  onThumbPointerDown,
  onScrollbarPointerMove,
  onScrollbarPointerUp,
}) {
  if (!overlayThumb) return null;

  const show = scrollbarVisible || isDragging;

  return (
    <div
      className="absolute right-0 top-2 bottom-2 z-20 w-3 touch-none select-none"
      role="presentation"
      onPointerDown={onTrackPointerDown}
      onPointerMove={onScrollbarPointerMove}
      onPointerUp={onScrollbarPointerUp}
      onPointerCancel={onScrollbarPointerUp}
    >
      <div
        className={`absolute right-1 w-1.5 rounded-full bg-gray-400 transition-opacity duration-200 cursor-grab active:cursor-grabbing ${
          show ? 'opacity-90' : 'opacity-0'
        }`}
        style={{
          top: `${overlayThumb.top}px`,
          height: `${overlayThumb.thumbHeight}px`,
        }}
        onPointerDown={onThumbPointerDown}
      />
    </div>
  );
}
