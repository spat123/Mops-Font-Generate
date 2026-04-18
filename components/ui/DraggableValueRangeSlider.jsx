import React, { useCallback, useEffect, useRef, useState } from 'react';

/** Привязка к шагу и границам [min, max] */
export function snapValueToStep(value, min, max, step) {
  if (!Number.isFinite(value)) return min;
  if (max === min) return min;
  const s = step > 0 ? step : 1;
  const snapped = min + Math.round((value - min) / s) * s;
  const decimals = (String(s).split('.')[1] || '').length;
  const rounded = decimals > 0 ? Number(snapped.toFixed(decimals)) : Math.round(snapped);
  return Math.min(max, Math.max(min, rounded));
}

function valueToPercent(value, min, max) {
  if (!Number.isFinite(value) || max === min) return 0;
  return ((value - min) / (max - min)) * 100;
}

/**
 * Слайдер как у Variable Axes: серая дорожка, градиент, перетаскиваемая «таблетка» со значением.
 * Native thumb скрыт (стили в globals.css для .variable-font-slider-container).
 *
 * @param {number} value
 * @param {(v: number) => void} onChange — range и ввод в поле (полное обновление)
 * @param {(v: number) => void} [onMarkerDrag] — во время перетаскивания таблетки (лёгкое обновление у VF)
 * @param {(v: number) => void} [onMarkerDragEnd] — отпускание после перетаскивания таблетки (финальный sync у VF)
 * @param {number} [defaultMarkerValue] — жёлтый маркер «значение по умолчанию» (оси)
 * @param {string} [interactionLockId] — блокировка других осей при вводе в таблетке
 * @param {(id: string | null) => void} [onInteractionLock]
 */
export default function DraggableValueRangeSlider({
  min,
  max,
  step = 1,
  value,
  disabled = false,
  defaultMarkerValue,
  onChange,
  onMarkerDrag,
  onMarkerDragEnd,
  formatDisplay = (v) => String(v),
  interactionLockId,
  onInteractionLock,
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [active, setActive] = useState(false);
  const [hover, setHover] = useState(false);

  const inputRef = useRef(null);
  const dragInfo = useRef(null);
  const clickTimer = useRef(null);

  const hot = !disabled && (active || hover);

  const percent = valueToPercent(value, min, max);
  const defaultPercent =
    defaultMarkerValue !== undefined && defaultMarkerValue !== null
      ? valueToPercent(Number(defaultMarkerValue), min, max)
      : null;

  const emitMarkerMove = onMarkerDrag ?? onChange;
  const emitMarkerEnd = onMarkerDragEnd;

  const handleRangeChange = useCallback(
    (e) => {
      const raw = parseFloat(e.target.value);
      const v = snapValueToStep(raw, min, max, step);
      onChange(v);
    },
    [min, max, step, onChange]
  );

  const handleMarkerMouseDown = useCallback(
    (e) => {
      if (disabled) return;

      setActive(true);

      const sliderContainer = e.currentTarget.parentElement;
      const sliderRect = sliderContainer.getBoundingClientRect();
      const effectiveSliderWidth = sliderRect.width;
      const paddingPercent = 5;
      const paddingPx = (effectiveSliderWidth * paddingPercent) / 100;

      const startX = e.clientX;
      const startValue = value;

      dragInfo.current = {
        startX,
        startValue,
        sliderWidth: effectiveSliderWidth,
        range: max - min,
        minValue: min,
        maxValue: max,
        moveStarted: false,
        sliderRect,
        paddingPx,
        lastUpdateTime: 0,
        animationFrameId: null,
        pendingValue: null,
        lastValue: startValue,
        activeAxis: true,
      };

      const scheduleValueUpdate = (newValue) => {
        if (dragInfo.current?.animationFrameId) {
          cancelAnimationFrame(dragInfo.current.animationFrameId);
        }
        dragInfo.current.pendingValue = newValue;
        dragInfo.current.lastValue = newValue;
        dragInfo.current.animationFrameId = requestAnimationFrame(() => {
          if (!dragInfo.current || dragInfo.current.pendingValue === null) return;
          const v = snapValueToStep(dragInfo.current.pendingValue, min, max, step);
          emitMarkerMove(v);
          dragInfo.current.pendingValue = null;
          dragInfo.current.animationFrameId = null;
        });
      };

      clickTimer.current = setTimeout(() => {
        if (!dragInfo.current?.moveStarted) {
          setEditing(true);
          setEditValue(String(formatDisplay(value)));
          setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
          }, 50);
        }
        clickTimer.current = null;
      }, 300);

      const handleMouseMove = (moveEvent) => {
        if (!dragInfo.current) return;

        if (moveEvent.buttons === 0) {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          if (clickTimer.current) {
            clearTimeout(clickTimer.current);
            clickTimer.current = null;
          }
          if (dragInfo.current.animationFrameId) {
            cancelAnimationFrame(dragInfo.current.animationFrameId);
          }
          dragInfo.current = null;
          setActive(false);
          return;
        }

        const moveX = moveEvent.clientX - dragInfo.current.startX;
        if (!dragInfo.current.moveStarted && Math.abs(moveX) > 3) {
          dragInfo.current.moveStarted = true;
          if (clickTimer.current) {
            clearTimeout(clickTimer.current);
            clickTimer.current = null;
          }
        }

        if (!dragInfo.current.moveStarted) return;

        const effectiveWidth = dragInfo.current.sliderWidth - dragInfo.current.paddingPx * 2;
        const mouseXRelative = moveEvent.clientX - dragInfo.current.sliderRect.left;
        const boundedX = Math.max(
          dragInfo.current.paddingPx,
          Math.min(mouseXRelative, dragInfo.current.sliderWidth - dragInfo.current.paddingPx)
        );
        const effectivePercent = (boundedX - dragInfo.current.paddingPx) / effectiveWidth;
        let newValue = dragInfo.current.minValue + effectivePercent * dragInfo.current.range;
        newValue = Math.max(dragInfo.current.minValue, Math.min(dragInfo.current.maxValue, newValue));

        const now = performance.now();
        const timeSinceLastUpdate = now - (dragInfo.current.lastUpdateTime || 0);
        if (timeSinceLastUpdate >= 16.7) {
          dragInfo.current.lastUpdateTime = now;
          scheduleValueUpdate(newValue);
        }
      };

      const handleMouseUp = () => {
        if (!dragInfo.current?.moveStarted && clickTimer.current) {
          clearTimeout(clickTimer.current);
          clickTimer.current = null;
          setEditing(true);
          setEditValue(String(formatDisplay(value)));
          setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
          }, 50);
        }

        if (dragInfo.current?.animationFrameId) {
          cancelAnimationFrame(dragInfo.current.animationFrameId);
          dragInfo.current.animationFrameId = null;
        }

        const wasDragging = Boolean(dragInfo.current?.moveStarted);
        const lastV = dragInfo.current?.lastValue;

        if (wasDragging && lastV !== undefined && emitMarkerEnd) {
          const v = snapValueToStep(lastV, min, max, step);
          emitMarkerEnd(v);
        }

        setActive(false);
        dragInfo.current = null;

        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      e.preventDefault();
      e.stopPropagation();
    },
    [disabled, emitMarkerEnd, emitMarkerMove, formatDisplay, max, min, step, value]
  );

  useEffect(() => {
    return () => {
      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!interactionLockId || !onInteractionLock) return;
    onInteractionLock(editing ? interactionLockId : null);
    return () => onInteractionLock(null);
  }, [editing, interactionLockId, onInteractionLock]);

  const commitEdit = useCallback(() => {
    const parsed = parseFloat(editValue);
    if (!Number.isNaN(parsed)) {
      const v = snapValueToStep(parsed, min, max, step);
      onChange(v);
    }
    setEditing(false);
  }, [editValue, min, max, step, onChange]);

  return (
    <div
      className="relative flex h-8 w-full items-center variable-font-slider-container"
      onMouseEnter={() => {
        if (!disabled) setHover(true);
      }}
      onMouseLeave={() => setHover(false)}
    >
      {/* Фон дорожки — как раньше (серый), не меняется при hover */}
      <div className="absolute left-0 right-0 h-1 rounded-full bg-gray-200">
        <div
          className={`absolute top-0 left-0 h-full rounded-full transition-colors duration-200 ease-out ${
            disabled ? 'bg-gray-400' : hot ? 'bg-accent' : 'bg-black'
          }`}
          style={{ width: `${percent}%` }}
        />
        {defaultPercent !== null && !Number.isNaN(defaultPercent) && (
          <div
            className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-yellow-400"
            style={{
              left: `calc(20px + (${defaultPercent} * (100% - 40px) / 100))`,
            }}
            title="Значение по умолчанию"
          />
        )}
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={handleRangeChange}
        className="absolute left-0 right-0 z-20 h-5 cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
        style={{ WebkitAppearance: 'none', appearance: 'none' }}
      />

      <div
        className={`absolute z-30 flex h-6 w-10 -translate-x-1/2 transform cursor-pointer items-center justify-center rounded-full border-2 border-white text-[0.65rem] font-medium text-white transition-[transform,background-color] duration-200 ease-out hover:scale-110 ${
          disabled
            ? 'bg-gray-400'
            : hot
              ? active
                ? 'bg-accent-hover'
                : 'bg-accent'
              : 'bg-black'
        } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
        style={{
          left: `calc(20px + (${percent} * (100% - 40px) / 100))`,
        }}
        onMouseDown={handleMarkerMouseDown}
        onDoubleClick={() => {
          if (disabled) return;
          setEditing(true);
          setEditValue(String(formatDisplay(value)));
          setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
          }, 50);
        }}
      >
        {editing ? (
          <input
            ref={inputRef}
            type="number"
            min={min}
            max={max}
            step={step}
            className="no-arrows h-6 w-10 appearance-none rounded-full border-0 bg-white px-1 text-center text-[0.65rem] text-accent focus:ring-1 focus:ring-accent/40 focus:outline-none"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitEdit();
              } else if (e.key === 'Escape') {
                setEditing(false);
              }
            }}
            onBlur={commitEdit}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <span className="pointer-events-none flex h-full w-full select-none items-center justify-center">
            {formatDisplay(value)}
          </span>
        )}
      </div>
    </div>
  );
}
