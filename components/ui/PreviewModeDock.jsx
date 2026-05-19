import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { SegmentedControl, VIEW_MODE_OPTIONS } from './SegmentedControl';

/**
 * Нижняя панель переключения режима превью.
 * Авто-прячется вниз и появляется при наведении/фокусе.
 */
export function PreviewModeDock({ bottomOffsetPx = 52, className = '' }) {
  const { viewMode, setViewMode } = useSettings();

  // Над EditorStatusBar (min-h-[52px]) + небольшой отступ.
  const bottom = Math.max(0, Number(bottomOffsetPx) || 0) + 10;

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 z-30 flex justify-center ${className}`.trim()}
      style={{ bottom }}
      aria-label="Переключение режима превью"
    >
      <div className="group pointer-events-auto">
        <div className="translate-y-[54px] transition-transform duration-200 ease-out group-hover:translate-y-0 group-focus-within:translate-y-0">
          <div className="h-[64px] w-fit rounded-xl border border-gray-200 bg-white/95 px-3 shadow-lg backdrop-blur">
            <div className="flex h-[10px] items-center justify-center" aria-hidden>
              <div className="h-1.5 w-10 rounded-full bg-gray-300/80" />
            </div>
            <div className="flex h-[54px] items-center justify-center">
              <SegmentedControl
                value={viewMode}
                onChange={setViewMode}
                options={VIEW_MODE_OPTIONS}
                variant="surface"
                label="Режим превью"
                className="w-[320px] min-w-0"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

