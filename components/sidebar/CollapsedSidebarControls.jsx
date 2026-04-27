import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Tooltip } from '../ui/Tooltip';
import { useDismissibleLayer } from '../ui/useDismissibleLayer';
import { hsvToRgb, rgbToHex, hexToHsv, hexToRgbComponents } from '../../utils/colorUtils';

function getNextCycleValue(options, currentValue) {
  const values = (Array.isArray(options) ? options : [])
    .map((option) => (typeof option === 'string' ? option : String(option?.value || '').trim()))
    .filter(Boolean);
  if (values.length === 0) return currentValue;
  const currentIdx = values.indexOf(String(currentValue || '').trim());
  if (currentIdx < 0) return values[0];
  return values[(currentIdx + 1) % values.length];
}

function normalizeHexColor(rawValue, fallback = '#000000') {
  const raw = String(rawValue || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const r = raw[1];
    const g = raw[2];
    const b = raw[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return fallback;
}

const COLOR_VALUE_ROW = 'flex min-w-0 w-full max-w-full items-center gap-2';
const COLOR_FIELD_INPUT =
  'min-w-0 flex-1 h-8 rounded-md border border-gray-50 bg-gray-50 px-2 py-1.5 text-xs tabular-nums text-gray-800 placeholder:text-gray-400 focus:border-black/[0.14] focus:outline-none';

function RgbTripletInputs({ hex, onChannelChange }) {
  const { r, g, b } = hexToRgbComponents(hex);
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <input
        type="number"
        min={0}
        max={255}
        step={1}
        inputMode="numeric"
        aria-label="R, 0-255"
        value={r}
        onChange={(e) => onChannelChange('r', e.target.value)}
        className={COLOR_FIELD_INPUT}
      />
      <input
        type="number"
        min={0}
        max={255}
        step={1}
        inputMode="numeric"
        aria-label="G, 0-255"
        value={g}
        onChange={(e) => onChannelChange('g', e.target.value)}
        className={COLOR_FIELD_INPUT}
      />
      <input
        type="number"
        min={0}
        max={255}
        step={1}
        inputMode="numeric"
        aria-label="B, 0-255"
        value={b}
        onChange={(e) => onChannelChange('b', e.target.value)}
        className={COLOR_FIELD_INPUT}
      />
    </div>
  );
}

function CollapsedColorEditor({
  fieldRef,
  sliderRef,
  onFieldClick,
  onFieldMouseDown,
  onSliderClick,
  onSliderMouseDown,
  fieldBackground,
  previewColor,
  colorPos,
  sliderPos,
  sliderKnobColor,
  colorMode,
  onToggleMode,
  colorValue,
  onColorValueChange,
  onChannelChange,
  hexAriaLabel,
}) {
  return (
    <div>
      <div
        ref={fieldRef}
        className="rounded-xl h-24 mb-3 relative cursor-pointer"
        onClick={onFieldClick}
        onMouseDown={onFieldMouseDown}
        style={{
          background: fieldBackground,
          backgroundBlendMode: 'multiply',
        }}
      >
        <div className="absolute inset-0 p-3">
          <div className="w-full h-full rounded-md relative">
            <div
              className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2"
              style={{
                backgroundColor: previewColor,
                left: colorPos.left,
                top: colorPos.top,
              }}
            />
          </div>
        </div>
      </div>

      <div
        ref={sliderRef}
        className="h-6 rounded-xl mb-3 relative cursor-pointer"
        onClick={onSliderClick}
        onMouseDown={onSliderMouseDown}
        style={{
          background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
          boxSizing: 'border-box',
          padding: '0',
        }}
      >
        <div className="absolute inset-0 px-3">
          <div className="w-full h-full rounded-md relative">
            <div
              className="absolute w-4 h-4 rounded-full shadow-md top-1/2"
              style={{
                left: sliderPos,
                transform: 'translate(-50%, -50%)',
                backgroundColor: sliderKnobColor,
                border: '2px solid white',
              }}
            />
          </div>
        </div>
      </div>

      <div className={COLOR_VALUE_ROW}>
        <div className="flex shrink-0 items-center">
          <Tooltip content="Переключить между HEX и RGB">
            <button
              type="button"
              className="flex items-center h-8 rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-800 hover:bg-gray-200"
              onClick={onToggleMode}
              aria-label="Переключить HEX и RGB"
            >
              {colorMode.toUpperCase()}
            </button>
          </Tooltip>
        </div>
        {colorMode === 'hex' ? (
          <input
            type="text"
            value={colorValue}
            onChange={(e) => onColorValueChange(e.target.value)}
            spellCheck={false}
            aria-label={hexAriaLabel}
            className={COLOR_FIELD_INPUT}
          />
        ) : (
          <RgbTripletInputs hex={normalizeHexColor(colorValue, '#000000')} onChannelChange={onChannelChange} />
        )}
      </div>
    </div>
  );
}

function QuickPresetIcon({ kind, itemKey, className = 'h-4 w-4' }) {
  if (kind === 'sample' && itemKey === 'title') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M4 5h16M8 5v14m8-14v14M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 'sample' && itemKey === 'paragraph') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M5 6h14M5 10h14M5 14h10M5 18h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 'sample' && itemKey === 'wikipedia') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M4 6h16M6 6l4.5 12L12 13l1.5 5L18 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === 'sample' && itemKey === 'pangram') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M4 12h16M12 4v16M7 7l10 10M17 7 7 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 'glyph' && itemKey === 'macos') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M14.5 4c-.5 1.2-1.5 2.2-2.8 2.5M10 8c-3 0-5 2.5-5 6 0 3 1.6 6 4 6 1.2 0 1.9-.5 3-.5s1.8.5 3 .5c2.4 0 4-3 4-6 0-3.5-2-6-5-6-.9 0-1.7.3-2 .5-.3-.2-1.1-.5-2-.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === 'glyph' && itemKey === 'windows1252') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M3 4.5 11 3v8H3v-6.5Zm10 6.5V3l8-1v9h-8ZM3 13h8v8L3 19.5V13Zm10 0h8v9l-8-1v-8Z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === 'glyph' && itemKey === 'latin_extended') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M5 18 10 6l5 12M8 13h4M18 8v10M15 11h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M5 6h14M5 12h14M5 18h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CollapsedLibraryRail({
  libraries = [],
  activeLibraryId = null,
  onOpenLibrary,
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-2">
      <div className="editor-sidebar-scroll flex min-h-0 w-full flex-1 flex-col items-center gap-2 overflow-y-auto pb-1">
        {(Array.isArray(libraries) ? libraries : []).map((library) => {
          const isActive = activeLibraryId === library?.id;
          const fontCount = Array.isArray(library?.fonts) ? library.fonts.length : 0;
          return (
            <Tooltip key={library?.id || library?.name || 'library'} content={library?.name || 'Библиотека'}>
              <button
                type="button"
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-semibold leading-none transition-colors ${
                  isActive
                    ? 'border-accent bg-accent text-white'
                    : 'border-gray-300 bg-white text-gray-900 hover:border-black hover:bg-black hover:text-white'
                }`}
                aria-label={`${library?.name || 'Библиотека'}: ${fontCount}`}
                aria-pressed={isActive}
                onClick={() => onOpenLibrary?.(library?.id || null)}
              >
                {fontCount}
              </button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

export function CollapsedSidebarControls({
  isLibraryTab,
  library,
  options,
  ui,
  state,
  actions,
  icons,
}) {
  if (isLibraryTab) {
    return (
      <CollapsedLibraryRail
        libraries={library?.libraries}
        activeLibraryId={library?.activeLibraryId}
        onOpenLibrary={library?.onOpenLibrary}
      />
    );
  }
  const {
    viewModeOptions,
    textAlignOptions,
    verticalAlignOptions,
    textCaseOptions,
    textDecorationOptions,
    sidebarPresetOptions,
    waterfallScalePresets,
    quickPresetSections,
  } = options;
  const {
    activeViewModeOption,
    activeTextAlignOption,
    activeVerticalAlignOption,
    activeWaterfallScalePreset,
    collapsedStylePresetName,
    collapsedStylePresetStyle,
    collapsedStylePresetLetter,
  } = ui;
  const {
    viewMode,
    isWaterfallView,
    waterfallEditTarget,
    selectedFont,
    availableStyles,
    isStylesView,
    fontSizeControl,
    letterSpacingControl,
    lineHeightControl,
    isGlyphsView,
    textAlignment,
    verticalAlignment,
    textCase,
    textDecoration,
    isTextCaseDisabled,
    countControl,
    isTextModeDisabled,
    textFill,
    isTextFillDisabled,
    waterfallScaleRatio,
    waterfallUnit,
    waterfallRoundTooltip,
    waterfallRoundEnabled,
    isAnimating,
    textColor,
    backgroundColor,
    previewBackgroundImage,
    sidebarTextPreset,
  } = state;
  const {
    setViewMode,
    setWaterfallEditTarget,
    applyPresetStyle,
    setWaterfallBodyPresetName,
    setWaterfallHeadingPresetName,
    setTextAlignment,
    setVerticalAlignment,
    setTextCase,
    setTextDecoration,
    toggleTextFillHandler,
    setWaterfallScaleSelectKey,
    setWaterfallScaleRatio,
    setWaterfallUnit,
    setWaterfallRoundPx,
    isVariableEnabled,
    toggleAnimation,
    resetVariableSettings,
    setTextColor,
    setBackgroundColor,
    setPreviewBackgroundImage,
    pickSidebarTextPreset,
  } = actions;
  const {
    ActiveViewModeIcon,
    ActiveTextAlignIcon,
    ActiveVerticalAlignIcon,
    TextFillIcon,
    RoundingIcon,
  } = icons;

  const collapsedStylePopoverRef = useRef(null);
  const collapsedStyleTriggerRef = useRef(null);
  const collapsedStyleMenuRef = useRef(null);
  const collapsedScalePopoverRef = useRef(null);
  const collapsedScaleTriggerRef = useRef(null);
  const collapsedScaleMenuRef = useRef(null);
  const collapsedTextColorPopoverRef = useRef(null);
  const collapsedTextColorTriggerRef = useRef(null);
  const collapsedBgColorPopoverRef = useRef(null);
  const collapsedBgColorTriggerRef = useRef(null);
  const collapsedColorMenuRef = useRef(null);
  const previewBgFileInputRef = useRef(null);
  const fgColorFieldRef = useRef(null);
  const bgColorFieldRef = useRef(null);
  const fgColorSliderRef = useRef(null);
  const bgColorSliderRef = useRef(null);
  const [isCollapsedStyleMenuOpen, setIsCollapsedStyleMenuOpen] = useState(false);
  const [isCollapsedScaleMenuOpen, setIsCollapsedScaleMenuOpen] = useState(false);
  const [collapsedColorTarget, setCollapsedColorTarget] = useState(null);
  const [collapsedStyleMenuPosition, setCollapsedStyleMenuPosition] = useState({
    top: 0,
    left: 0,
    ready: false,
  });
  const [collapsedScaleMenuPosition, setCollapsedScaleMenuPosition] = useState({
    top: 0,
    left: 0,
    ready: false,
  });
  const [collapsedColorMenuPosition, setCollapsedColorMenuPosition] = useState({
    top: 0,
    left: 0,
    ready: false,
  });
  const collapsedHintTimerRef = useRef(null);
  const [collapsedCycleHint, setCollapsedCycleHint] = useState('');
  const [collapsedCycleHintRect, setCollapsedCycleHintRect] = useState(null);
  const [fgColorPos, setFgColorPos] = useState(() => {
    if (textColor && textColor.startsWith('#')) {
      const [, s, v] = hexToHsv(textColor);
      return { left: `${s}%`, top: `${100 - v}%` };
    }
    return { left: '0%', top: '100%' };
  });
  const [bgColorPos, setBgColorPos] = useState(() => {
    if (backgroundColor && backgroundColor.startsWith('#')) {
      const [, s, v] = hexToHsv(backgroundColor);
      return { left: `${s}%`, top: `${100 - v}%` };
    }
    return { left: '0%', top: '0%' };
  });
  const [fgSliderPos, setFgSliderPos] = useState(() => {
    if (textColor && textColor.startsWith('#')) {
      const [h] = hexToHsv(textColor);
      return `${h / 3.6}%`;
    }
    return '0%';
  });
  const [bgSliderPos, setBgSliderPos] = useState(() => {
    if (backgroundColor && backgroundColor.startsWith('#')) {
      const [h] = hexToHsv(backgroundColor);
      return `${h / 3.6}%`;
    }
    return '0%';
  });
  const [isDraggingFgField, setIsDraggingFgField] = useState(false);
  const [isDraggingBgField, setIsDraggingBgField] = useState(false);
  const [isDraggingFgSlider, setIsDraggingFgSlider] = useState(false);
  const [isDraggingBgSlider, setIsDraggingBgSlider] = useState(false);
  const [fgColorMode, setFgColorMode] = useState('hex');
  const [bgColorMode, setBgColorMode] = useState('hex');

  useDismissibleLayer({
    open: isCollapsedStyleMenuOpen,
    refs: [collapsedStylePopoverRef, collapsedStyleMenuRef],
    onDismiss: () => setIsCollapsedStyleMenuOpen(false),
  });
  useDismissibleLayer({
    open: isCollapsedScaleMenuOpen,
    refs: [collapsedScalePopoverRef, collapsedScaleMenuRef],
    onDismiss: () => setIsCollapsedScaleMenuOpen(false),
  });
  useDismissibleLayer({
    open: Boolean(collapsedColorTarget),
    refs: [collapsedTextColorPopoverRef, collapsedBgColorPopoverRef, collapsedColorMenuRef],
    onDismiss: () => setCollapsedColorTarget(null),
  });

  useEffect(() => {
    if (!isCollapsedStyleMenuOpen) {
      setCollapsedStyleMenuPosition((prev) => ({ ...prev, ready: false }));
      return undefined;
    }
    const updateMenuPosition = () => {
      const triggerEl = collapsedStyleTriggerRef.current;
      if (!triggerEl) return;
      const triggerRect = triggerEl.getBoundingClientRect();
      const menuEl = collapsedStyleMenuRef.current;
      const menuWidth = Math.max(192, menuEl?.offsetWidth || 192);
      const menuHeight = Math.max(80, menuEl?.offsetHeight || 220);
      const viewportW = window.innerWidth || 0;
      const viewportH = window.innerHeight || 0;
      const edgeGap = 8;
      const gap = 16;
      let left = triggerRect.right + gap;
      if (left + menuWidth > viewportW - edgeGap) {
        left = Math.max(edgeGap, triggerRect.left - gap - menuWidth);
      }
      let top = triggerRect.top;
      if (top + menuHeight > viewportH - edgeGap) {
        top = Math.max(edgeGap, viewportH - edgeGap - menuHeight);
      }
      setCollapsedStyleMenuPosition({ top, left, ready: true });
    };
    const raf = requestAnimationFrame(updateMenuPosition);
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isCollapsedStyleMenuOpen]);
  useEffect(() => {
    return () => {
      if (collapsedHintTimerRef.current) {
        clearTimeout(collapsedHintTimerRef.current);
      }
    };
  }, []);

  const showCollapsedHint = (hint, anchorEl = null) => {
    if (anchorEl instanceof HTMLElement) {
      const rect = anchorEl.getBoundingClientRect();
      setCollapsedCycleHintRect({
        top: rect.top,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setCollapsedCycleHintRect(null);
    }
    setCollapsedCycleHint(hint);
    if (collapsedHintTimerRef.current) {
      clearTimeout(collapsedHintTimerRef.current);
    }
    collapsedHintTimerRef.current = setTimeout(() => {
      setCollapsedCycleHint('');
      setCollapsedCycleHintRect(null);
      collapsedHintTimerRef.current = null;
    }, 800);
  };

  const cycleViewMode = (anchorEl) => {
    const next = getNextCycleValue(viewModeOptions, viewMode);
    setViewMode(next);
    showCollapsedHint(`mode:${next}`, anchorEl);
  };
  const cycleWaterfallEditTargetCollapsed = (anchorEl) => {
    if (!isWaterfallView) return;
    const next = waterfallEditTarget === 'body' ? 'heading' : 'body';
    setWaterfallEditTarget(next);
    showCollapsedHint(next === 'heading' ? 'wf:H' : 'wf:Body', anchorEl);
  };
  const cycleTextAlignment = (anchorEl) => {
    const next = getNextCycleValue(textAlignOptions, textAlignment);
    setTextAlignment(next);
    showCollapsedHint(`align:${next}`, anchorEl);
  };
  const cycleVerticalAlignment = (anchorEl) => {
    if (viewMode === 'waterfall' || isGlyphsView || isStylesView) return;
    const next = getNextCycleValue(verticalAlignOptions, verticalAlignment);
    setVerticalAlignment(next);
    showCollapsedHint(`v:${next}`, anchorEl);
  };
  const cycleTextCase = (anchorEl) => {
    if (isGlyphsView) return;
    const next = getNextCycleValue(textCaseOptions, textCase);
    setTextCase(next);
    showCollapsedHint(next === 'uppercase' ? 'case:AA' : 'case:Aa', anchorEl);
  };
  const cycleTextDecoration = (anchorEl) => {
    if (isGlyphsView) return;
    const order = ['none', ...textDecorationOptions.map((option) => option.value)];
    const next = getNextCycleValue(order, textDecoration);
    setTextDecoration(next);
    showCollapsedHint(
      next === 'none' ? 'decor:none' : next === 'underline' ? 'decor:U' : 'decor:S',
      anchorEl,
    );
  };
  const cycleWaterfallUnitCollapsed = (anchorEl) => {
    if (!isWaterfallView) return;
    const next = getNextCycleValue(['px', 'rem', 'pt'], waterfallUnit);
    setWaterfallUnit(next);
    showCollapsedHint(`unit:${String(next).toUpperCase()}`, anchorEl);
  };

  useEffect(() => {
    if (!isCollapsedScaleMenuOpen) {
      setCollapsedScaleMenuPosition((prev) => ({ ...prev, ready: false }));
      return undefined;
    }
    const updateMenuPosition = () => {
      const triggerEl = collapsedScaleTriggerRef.current;
      if (!triggerEl) return;
      const triggerRect = triggerEl.getBoundingClientRect();
      const menuEl = collapsedScaleMenuRef.current;
      const menuWidth = Math.max(192, menuEl?.offsetWidth || 192);
      const menuHeight = Math.max(80, menuEl?.offsetHeight || 220);
      const viewportW = window.innerWidth || 0;
      const viewportH = window.innerHeight || 0;
      const edgeGap = 8;
      const gap = 8;
      let left = triggerRect.right + gap;
      if (left + menuWidth > viewportW - edgeGap) {
        left = Math.max(edgeGap, triggerRect.left - gap - menuWidth);
      }
      let top = triggerRect.top;
      if (top + menuHeight > viewportH - edgeGap) {
        top = Math.max(edgeGap, viewportH - edgeGap - menuHeight);
      }
      setCollapsedScaleMenuPosition({ top, left, ready: true });
    };
    const raf = requestAnimationFrame(updateMenuPosition);
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isCollapsedScaleMenuOpen]);
  useEffect(() => {
    if (!collapsedColorTarget) {
      setCollapsedColorMenuPosition((prev) => ({ ...prev, ready: false }));
      return undefined;
    }
    const updateMenuPosition = () => {
      const triggerEl =
        collapsedColorTarget === 'background'
          ? collapsedBgColorTriggerRef.current
          : collapsedTextColorTriggerRef.current;
      if (!triggerEl) return;
      const triggerRect = triggerEl.getBoundingClientRect();
      const menuEl = collapsedColorMenuRef.current;
      const menuWidth = Math.max(216, menuEl?.offsetWidth || 216);
      const menuHeight = Math.max(132, menuEl?.offsetHeight || 180);
      const viewportW = window.innerWidth || 0;
      const viewportH = window.innerHeight || 0;
      const edgeGap = 8;
      const gap = 8;
      let left = triggerRect.right + gap;
      if (left + menuWidth > viewportW - edgeGap) {
        left = Math.max(edgeGap, triggerRect.left - gap - menuWidth);
      }
      let top = triggerRect.top;
      if (top + menuHeight > viewportH - edgeGap) {
        top = Math.max(edgeGap, viewportH - edgeGap - menuHeight);
      }
      setCollapsedColorMenuPosition({ top, left, ready: true });
    };
    const raf = requestAnimationFrame(updateMenuPosition);
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [collapsedColorTarget]);

  useEffect(() => {
    if (textColor && textColor.startsWith('#')) {
      const [h, s, v] = hexToHsv(textColor);
      setFgColorPos({ left: `${s}%`, top: `${100 - v}%` });
      setFgSliderPos(`${h / 3.6}%`);
    }
    if (backgroundColor && backgroundColor.startsWith('#')) {
      const [h, s, v] = hexToHsv(backgroundColor);
      setBgColorPos({ left: `${s}%`, top: `${100 - v}%` });
      setBgSliderPos(`${h / 3.6}%`);
    }
  }, [textColor, backgroundColor]);

  const getHueColor = (hue) => `hsl(${hue}, 100%, 50%)`;
  const createColorFromHSV = (h, s, v) => {
    const rgb = hsvToRgb(h, s, v);
    return rgbToHex(rgb[0], rgb[1], rgb[2]);
  };

  const getColorControlState = (isBackground) => {
    if (isBackground) {
      return {
        fieldRef: bgColorFieldRef,
        sliderRef: bgColorSliderRef,
        colorPos: bgColorPos,
        sliderPos: bgSliderPos,
        setColorPos: setBgColorPos,
        setSliderPos: setBgSliderPos,
        setColor: setBackgroundColor,
      };
    }
    return {
      fieldRef: fgColorFieldRef,
      sliderRef: fgColorSliderRef,
      colorPos: fgColorPos,
      sliderPos: fgSliderPos,
      setColorPos: setFgColorPos,
      setSliderPos: setFgSliderPos,
      setColor: setTextColor,
    };
  };

  const getColorDragSetter = (dragTarget, isBackground) => {
    if (dragTarget === 'field') {
      return isBackground ? setIsDraggingBgField : setIsDraggingFgField;
    }
    return isBackground ? setIsDraggingBgSlider : setIsDraggingFgSlider;
  };

  const handleColorFieldClick = (e, isBackground) => {
    const { fieldRef, sliderPos, setColorPos, setColor } = getColorControlState(isBackground);
    const field = fieldRef.current;
    if (!field) return;
    const innerField = field.querySelector('.absolute.inset-0.p-3 > div');
    if (!innerField) return;
    const rect = innerField.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xPercent = Math.min(100, Math.max(0, (x / rect.width) * 100));
    const yPercent = Math.min(100, Math.max(0, (y / rect.height) * 100));
    setColorPos({ left: `${xPercent}%`, top: `${yPercent}%` });
    const hue = parseFloat(sliderPos) * 3.6;
    const saturation = xPercent / 100;
    const value = 1 - yPercent / 100;
    setColor(createColorFromHSV(hue, saturation, value));
  };

  const handleColorSliderClick = (e, isBackground) => {
    const { sliderRef, colorPos, setSliderPos, setColor } = getColorControlState(isBackground);
    const slider = sliderRef.current;
    if (!slider) return;
    const innerSlider = slider.querySelector('.absolute.inset-0.px-3 > div');
    if (!innerSlider) return;
    const rect = innerSlider.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setSliderPos(`${percentage}%`);
    const saturation = parseFloat(colorPos.left) / 100;
    const value = 1 - parseFloat(colorPos.top) / 100;
    const hue = percentage * 3.6;
    setColor(createColorFromHSV(hue, saturation, value));
  };

  const startColorDrag = useCallback(
    (e, dragTarget, isBackground) => {
      if (dragTarget === 'field') handleColorFieldClick(e, isBackground);
      else handleColorSliderClick(e, isBackground);
      getColorDragSetter(dragTarget, isBackground)(true);
    },
    [bgColorPos, bgSliderPos, fgColorPos, fgSliderPos],
  );

  const stopAllColorDragging = useCallback(() => {
    setIsDraggingFgField(false);
    setIsDraggingBgField(false);
    setIsDraggingFgSlider(false);
    setIsDraggingBgSlider(false);
  }, []);

  useEffect(() => {
    const activeDragAction = [
      isDraggingFgField ? (e) => handleColorFieldClick(e, false) : null,
      isDraggingBgField ? (e) => handleColorFieldClick(e, true) : null,
      isDraggingFgSlider ? (e) => handleColorSliderClick(e, false) : null,
      isDraggingBgSlider ? (e) => handleColorSliderClick(e, true) : null,
    ].find(Boolean);
    if (!activeDragAction) return undefined;
    const handleMouseMove = (e) => {
      e.preventDefault();
      activeDragAction(e);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopAllColorDragging);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopAllColorDragging);
    };
  }, [
    isDraggingFgField,
    isDraggingBgField,
    isDraggingFgSlider,
    isDraggingBgSlider,
    stopAllColorDragging,
  ]);

  const handleRgbChannelChange = useCallback(
    (channel, raw, isBackground) => {
      const setColor = isBackground ? setBackgroundColor : setTextColor;
      const currentHex = isBackground ? backgroundColor : textColor;
      const { r, g, b } = hexToRgbComponents(normalizeHexColor(currentHex, '#000000'));
      const trimmed = String(raw).trim();
      const parsed = trimmed === '' ? NaN : parseInt(trimmed, 10);
      const n = Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(255, parsed));
      const next = { r, g, b, [channel]: n };
      setColor(rgbToHex(next.r, next.g, next.b));
    },
    [backgroundColor, textColor, setBackgroundColor, setTextColor],
  );

  const activeCollapsedColor = collapsedColorTarget === 'background' ? backgroundColor : textColor;
  const activeCollapsedColorSetter = collapsedColorTarget === 'background' ? setBackgroundColor : setTextColor;

  const toggleCollapsedColorMenu = (target) => {
    setCollapsedColorTarget((prev) => (prev === target ? null : target));
  };

  const handleSwapColors = () => {
    const nextText = normalizeHexColor(backgroundColor, '#FFFFFF');
    const nextBackground = normalizeHexColor(textColor, '#000000');
    setTextColor(nextText);
    setBackgroundColor(nextBackground);
  };

  const handleCollapsedPreviewBackgroundFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewBackgroundImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };
  return (
    <>
    <div className="flex h-full w-full flex-col items-stretch gap-2 [&_button:disabled]:pointer-events-none">
      <Tooltip content={activeViewModeOption?.title || 'Режим превью'} as="div" className="w-full">
        <button
          type="button"
          onClick={(event) => cycleViewMode(event.currentTarget)}
          className="inline-flex h-8 w-full items-center justify-center rounded-md bg-accent text-white transition-colors hover:bg-accent-hover"
          aria-label="Переключить режим превью"
        >
          {ActiveViewModeIcon ? <ActiveViewModeIcon className="h-4 w-4 shrink-0" /> : null}
        </button>
      </Tooltip>
      {isWaterfallView ? (
        <Tooltip
          content={`Waterfall цель: ${waterfallEditTarget === 'heading' ? 'Heading' : 'Body'}`}
          as="div"
          className="w-full"
        >
          <button
            type="button"
            onClick={(event) => cycleWaterfallEditTargetCollapsed(event.currentTarget)}
            className="inline-flex h-8 w-full items-center justify-center rounded-md bg-accent px-2 text-[11px] font-semibold uppercase text-white transition-colors hover:bg-accent-hover"
            aria-label="Переключить цель редактирования Waterfall"
          >
            {waterfallEditTarget === 'heading' ? 'H' : 'Body'}
          </button>
        </Tooltip>
      ) : null}

      {selectedFont && availableStyles?.length > 0 ? (
        <div ref={collapsedStylePopoverRef} className="relative flex w-full justify-center">
          <Tooltip
            content={`Начертание: ${collapsedStylePresetName || 'Regular'}`}
            as="div"
            className="w-full"
          >
            <button
              ref={collapsedStyleTriggerRef}
              type="button"
              onClick={() => setIsCollapsedStyleMenuOpen((prev) => !prev)}
              className="inline-flex h-8 w-full items-center justify-center rounded-md bg-gray-50 text-xs font-semibold uppercase text-gray-800 transition-colors hover:text-accent disabled:cursor-default disabled:opacity-40"
              aria-haspopup="menu"
              aria-expanded={isCollapsedStyleMenuOpen}
              aria-label="Выбрать начертание"
              disabled={isStylesView}
            >
              <span className="leading-none" style={collapsedStylePresetStyle}>
                {collapsedStylePresetLetter}
              </span>
            </button>
          </Tooltip>
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-2">
        <Tooltip content="Размер шрифта" as="div" className="w-full">
          <div className="group relative flex w-full items-stretch overflow-hidden rounded-md border border-gray-200 bg-white">
            <input
              type="number"
              step={1}
              value={Number.isFinite(Number(fontSizeControl.value)) ? fontSizeControl.value : ''}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (!Number.isFinite(next)) return;
                fontSizeControl.onChange(next);
              }}
              className="peer no-arrows h-8 min-w-0 flex-1 border-0 bg-transparent pl-2 text-xs font-semibold tabular-nums text-black focus:outline-none"
              aria-label="Размер шрифта"
            />
            <div className="invisible pointer-events-none absolute inset-y-0 right-0 z-10 flex w-5 flex-col border-l border-gray-200 bg-white/95 opacity-0 transition-opacity group-hover:visible group-hover:pointer-events-auto group-hover:opacity-100 peer-focus:invisible peer-focus:pointer-events-none peer-focus:opacity-0 peer-active:invisible peer-active:pointer-events-none peer-active:opacity-0">
              <button
                type="button"
                className="flex flex-1 items-end justify-center text-gray-700 hover:bg-black/[0.06]"
                aria-label="Увеличить размер шрифта"
                onClick={() => {
                  const current = Number(fontSizeControl.value);
                  const base = Number.isFinite(current) ? current : 12;
                  const next = Math.max(12, Math.min(300, Math.round(base + 1)));
                  fontSizeControl.onChange(next);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3 w-3" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                </svg>
              </button>
              <button
                type="button"
                className="flex flex-1 items-start justify-center text-gray-700 hover:bg-black/[0.06]"
                aria-label="Уменьшить размер шрифта"
                onClick={() => {
                  const current = Number(fontSizeControl.value);
                  const base = Number.isFinite(current) ? current : 12;
                  const next = Math.max(12, Math.min(300, Math.round(base - 1)));
                  fontSizeControl.onChange(next);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3 w-3" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </div>
          </div>
        </Tooltip>

        <Tooltip content="Межбуквенный интервал" as="div" className="w-full">
          <div className="group relative flex w-full items-stretch overflow-hidden rounded-md border border-gray-200 bg-white disabled:bg-gray-100">
            <input
              type="number"
              step={1}
              value={Number.isFinite(Number(letterSpacingControl.value)) ? letterSpacingControl.value : ''}
              disabled={isGlyphsView}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (!Number.isFinite(next)) return;
                letterSpacingControl.onChange(next);
              }}
              className="peer no-arrows h-8 min-w-0 flex-1 border-0 bg-transparent pl-2 text-xs font-semibold tabular-nums text-black focus:outline-none disabled:cursor-default disabled:bg-gray-100 disabled:text-gray-400"
              aria-label="Межбуквенный интервал"
            />
            <div className="invisible pointer-events-none absolute inset-y-0 right-0 z-10 flex w-5 flex-col border-l border-gray-200 bg-white/95 opacity-0 transition-opacity group-hover:visible group-hover:pointer-events-auto group-hover:opacity-100 peer-focus:invisible peer-focus:pointer-events-none peer-focus:opacity-0 peer-active:invisible peer-active:pointer-events-none peer-active:opacity-0">
              <button
                type="button"
                className="flex flex-1 items-end justify-center text-gray-700 hover:bg-black/[0.06] disabled:text-gray-400 disabled:hover:bg-transparent"
                aria-label="Увеличить межбуквенный интервал"
                disabled={isGlyphsView}
                onClick={() => {
                  const current = Number(letterSpacingControl.value);
                  const base = Number.isFinite(current) ? current : 0;
                  const next = Math.max(-100, Math.min(100, Math.round(base + 1)));
                  letterSpacingControl.onChange(next);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3 w-3" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                </svg>
              </button>
              <button
                type="button"
                className="flex flex-1 items-start justify-center text-gray-700 hover:bg-black/[0.06] disabled:text-gray-400 disabled:hover:bg-transparent"
                aria-label="Уменьшить межбуквенный интервал"
                disabled={isGlyphsView}
                onClick={() => {
                  const current = Number(letterSpacingControl.value);
                  const base = Number.isFinite(current) ? current : 0;
                  const next = Math.max(-100, Math.min(100, Math.round(base - 1)));
                  letterSpacingControl.onChange(next);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3 w-3" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </div>
          </div>
        </Tooltip>

        <Tooltip content="Межстрочный интервал" as="div" className="w-full">
          <div className="group relative flex w-full items-stretch overflow-hidden rounded-md border border-gray-200 bg-white">
            <input
              type="number"
              step={0.05}
              value={Number.isFinite(Number(lineHeightControl.value)) ? lineHeightControl.value : ''}
              disabled={isGlyphsView || isStylesView}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (!Number.isFinite(next)) return;
                lineHeightControl.onChange(next);
              }}
              className="peer no-arrows h-8 min-w-0 flex-1 border-0 bg-transparent pl-2 text-xs font-semibold tabular-nums text-black focus:outline-none disabled:cursor-default disabled:bg-gray-100 disabled:text-gray-400"
              aria-label="Межстрочный интервал"
            />
            <div className="invisible pointer-events-none absolute inset-y-0 right-0 z-10 flex w-5 flex-col border-l border-gray-200 bg-white/95 opacity-0 transition-opacity group-hover:visible group-hover:pointer-events-auto group-hover:opacity-100 peer-focus:invisible peer-focus:pointer-events-none peer-focus:opacity-0 peer-active:invisible peer-active:pointer-events-none peer-active:opacity-0">
              <button
                type="button"
                className="flex flex-1 items-end justify-center text-gray-700 hover:bg-black/[0.06] disabled:text-gray-400 disabled:hover:bg-transparent"
                aria-label="Увеличить межстрочный интервал"
                disabled={isGlyphsView || isStylesView}
                onClick={() => {
                  const current = Number(lineHeightControl.value);
                  const base = Number.isFinite(current) ? current : 1;
                  const next = Math.max(0.5, Math.min(3, Number((base + 0.05).toFixed(2))));
                  lineHeightControl.onChange(next);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3 w-3" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                </svg>
              </button>
              <button
                type="button"
                className="flex flex-1 items-start justify-center text-gray-700 hover:bg-black/[0.06] disabled:text-gray-400 disabled:hover:bg-transparent"
                aria-label="Уменьшить межстрочный интервал"
                disabled={isGlyphsView || isStylesView}
                onClick={() => {
                  const current = Number(lineHeightControl.value);
                  const base = Number.isFinite(current) ? current : 1;
                  const next = Math.max(0.5, Math.min(3, Number((base - 0.05).toFixed(2))));
                  lineHeightControl.onChange(next);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3 w-3" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </div>
          </div>
        </Tooltip>
      </div>
      <Tooltip
        content={activeTextAlignOption?.title || 'Выравнивание текста'}
        as="div"
        className="w-full"
      >
        <button
          type="button"
          onClick={(event) => cycleTextAlignment(event.currentTarget)}
          className="inline-flex h-8 w-full items-center justify-center rounded-md bg-gray-50 text-gray-800 transition-colors hover:text-accent disabled:cursor-default disabled:opacity-40"
          aria-label="Переключить выравнивание текста"
          disabled={isTextCaseDisabled}
        >
          {ActiveTextAlignIcon ? <ActiveTextAlignIcon className="h-4 w-4 shrink-0" /> : null}
        </button>
      </Tooltip>

      <Tooltip
        content={activeVerticalAlignOption?.title || 'Вертикальное выравнивание'}
        as="div"
        className="w-full"
      >
        <button
          type="button"
          onClick={(event) => cycleVerticalAlignment(event.currentTarget)}
          className="inline-flex h-8 w-full items-center justify-center rounded-md bg-gray-50 text-gray-800 transition-colors hover:text-accent disabled:cursor-default disabled:opacity-40"
          aria-label="Переключить вертикальное выравнивание"
          disabled={viewMode === 'waterfall' || isGlyphsView || isStylesView}
        >
          {ActiveVerticalAlignIcon ? (
            <ActiveVerticalAlignIcon className="h-4 w-4 shrink-0" />
          ) : null}
        </button>
      </Tooltip>

      <Tooltip
        content={textCase === 'uppercase' ? 'Верхний регистр' : 'Обычный регистр'}
        as="div"
        className="w-full"
      >
        <button
          type="button"
          onClick={(event) => cycleTextCase(event.currentTarget)}
          className="inline-flex h-8 w-full items-center justify-center rounded-md bg-gray-50 text-gray-800 transition-colors hover:text-accent disabled:cursor-default disabled:opacity-40"
          aria-label="Переключить регистр"
          disabled={isTextCaseDisabled}
        >
          <span className="text-[13px] font-semibold leading-none">
            {textCase === 'uppercase' ? 'АА' : 'Аа'}
          </span>
        </button>
      </Tooltip>

      <Tooltip
        content={
          textDecoration === 'underline'
            ? 'Подчёркивание'
            : textDecoration === 'line-through'
              ? 'Зачёркивание'
              : 'Без декора'
        }
        as="div"
        className="w-full"
      >
        <button
          type="button"
          onClick={(event) => cycleTextDecoration(event.currentTarget)}
          className="inline-flex h-8 w-full items-center justify-center rounded-md bg-gray-50 text-gray-800 transition-colors hover:text-accent disabled:cursor-default disabled:opacity-40"
          aria-label="Переключить декор текста"
          disabled={isTextCaseDisabled}
        >
          <span
            className={`text-[13px] font-semibold leading-none ${
              textDecoration === 'underline'
                ? 'underline'
                : textDecoration === 'line-through'
                  ? 'line-through'
                  : ''
            }`}
          >
            S
          </span>
        </button>
      </Tooltip>
      <Tooltip
        content={isWaterfallView ? 'Количество рядов' : 'Количество колонок'}
        as="div"
        className="w-full"
      >
        <div className="group relative flex w-full items-stretch overflow-hidden rounded-md border border-gray-200 bg-white">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={countControl.value}
            onChange={(event) => countControl.onChange(event.target.value)}
            onBlur={countControl.onBlur}
            disabled={isTextModeDisabled}
            className="peer no-arrows h-8 min-w-0 flex-1 border-0 bg-transparent pl-2 text-xs font-semibold tabular-nums text-black focus:outline-none disabled:cursor-default disabled:bg-gray-100 disabled:text-gray-400"
            aria-label={countControl.ariaLabel}
          />
          <div className="invisible pointer-events-none absolute inset-y-0 right-0 z-10 flex w-5 flex-col border-l border-gray-200 bg-white/95 opacity-0 transition-opacity group-hover:visible group-hover:pointer-events-auto group-hover:opacity-100 peer-focus:invisible peer-focus:pointer-events-none peer-focus:opacity-0 peer-active:invisible peer-active:pointer-events-none peer-active:opacity-0">
            <button
              type="button"
              className="flex flex-1 items-end justify-center text-gray-700 hover:bg-black/[0.06] disabled:text-gray-400 disabled:hover:bg-transparent"
              aria-label={countControl.incAriaLabel}
              onClick={countControl.onIncrement}
              disabled={isTextModeDisabled}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3 w-3" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
            </button>
            <button
              type="button"
              className="flex flex-1 items-start justify-center text-gray-700 hover:bg-black/[0.06] disabled:text-gray-400 disabled:hover:bg-transparent"
              aria-label={countControl.decAriaLabel}
              onClick={countControl.onDecrement}
              disabled={isTextModeDisabled}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3 w-3" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>
        </div>
      </Tooltip>
      <Tooltip content="Заполнить на весь экран" as="div" className="w-full">
        <button
          type="button"
          className={`inline-flex h-8 w-full items-center justify-center rounded-md transition-colors ${
            textFill
              ? 'bg-accent text-white hover:bg-accent-hover'
              : 'bg-gray-50 text-gray-800 hover:text-accent'
          } disabled:cursor-default disabled:opacity-40`}
          aria-label="Заполнить экран текстом"
          aria-pressed={textFill}
          disabled={isTextFillDisabled}
          onClick={toggleTextFillHandler}
        >
          {TextFillIcon ? <TextFillIcon className="h-4 w-4 shrink-0" /> : null}
        </button>
      </Tooltip>
      {isWaterfallView ? (
        <>
          <div ref={collapsedScalePopoverRef} className="relative flex w-full justify-center">
            <Tooltip
              content={`Waterfall scale: ${
                activeWaterfallScalePreset?.label || 'Custom'
              }`}
              as="div"
              className="w-full"
            >
              <button
                ref={collapsedScaleTriggerRef}
                type="button"
                onClick={() => setIsCollapsedScaleMenuOpen((prev) => !prev)}
                className="inline-flex h-8 w-full items-center justify-center rounded-md bg-gray-50 px-2 text-[11px] font-semibold tabular-nums text-black transition-colors hover:text-accent"
                aria-haspopup="menu"
                aria-expanded={isCollapsedScaleMenuOpen}
                aria-label="Выбрать scale Waterfall"
              >
                {activeWaterfallScalePreset
                  ? Number(activeWaterfallScalePreset.ratio).toFixed(3)
                  : Number(waterfallScaleRatio).toFixed(3)}
              </button>
            </Tooltip>
          </div>
          <Tooltip content={`Единицы: ${String(waterfallUnit).toUpperCase()}`} as="div" className="w-full">
            <button
              type="button"
              onClick={(event) => cycleWaterfallUnitCollapsed(event.currentTarget)}
              className="inline-flex h-8 w-full items-center justify-center rounded-md bg-accent text-[11px] font-semibold uppercase text-white transition-colors hover:bg-accent-hover"
              aria-label="Переключить единицы Waterfall"
            >
              {String(waterfallUnit).toUpperCase()}
            </button>
          </Tooltip>
          <Tooltip content={waterfallRoundTooltip} as="div" className="w-full">
            <button
              type="button"
              onClick={() => setWaterfallRoundPx((value) => !value)}
              className={`inline-flex h-8 w-full items-center justify-center rounded-md transition-colors ${
                waterfallRoundEnabled
                  ? 'bg-accent text-white hover:bg-accent-hover'
                  : 'bg-gray-50 text-gray-800 hover:text-accent'
              }`}
              aria-label="Переключить округление размеров Waterfall"
              aria-pressed={waterfallRoundEnabled}
            >
              {RoundingIcon ? <RoundingIcon className="h-4 w-4 shrink-0" /> : null}
            </button>
          </Tooltip>
        </>
      ) : null}
      {selectedFont && isVariableEnabled() ? (
        <div
          className={`-mx-2 grid grid-cols-1 gap-2 border-t border-gray-200 px-2 pt-2 ${isStylesView ? 'pointer-events-none opacity-40' : ''}`.trim()}
          aria-disabled={isStylesView || undefined}
        >
          <div className="inline-flex h-8 w-full items-center justify-center text-[11px] font-semibold uppercase text-gray-800">
            VA
          </div>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={toggleAnimation}
              className={`inline-flex h-8 w-full items-center justify-center rounded-md transition-colors ${
                isAnimating
                  ? 'bg-accent text-white hover:bg-accent-hover'
                  : 'bg-gray-50 text-gray-800 hover:bg-black/[0.04] hover:text-accent'
              }`}
              aria-label={isAnimating ? 'Остановить анимацию осей' : 'Запустить анимацию осей'}
            >
              {isAnimating ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={resetVariableSettings}
              className="inline-flex h-8 w-full items-center justify-center rounded-md bg-gray-50 text-gray-800 transition-colors hover:bg-black/[0.04] hover:text-accent"
              aria-label="Сбросить оси вариативного шрифта"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}
      <div className="-mx-2 mt-1 grid grid-cols-1 justify-items-center gap-2 border-t border-gray-200 px-2 pt-3 pb-1">
        <div ref={collapsedTextColorPopoverRef} className="w-full flex justify-center">
          <Tooltip content="Цвет текста" as="div">
            <button
              ref={collapsedTextColorTriggerRef}
              type="button"
              onClick={() => toggleCollapsedColorMenu('text')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-black/10 text-sm font-semibold leading-none"
              style={{
                backgroundColor: normalizeHexColor(textColor, '#111111'),
              }}
              aria-haspopup="dialog"
              aria-expanded={collapsedColorTarget === 'text'}
              aria-label="Цвет текста"
            >
              <span
                className="select-none text-white"
                style={{ mixBlendMode: 'difference', filter: 'contrast(180%) saturate(120%)' }}
              >
                T
              </span>
            </button>
          </Tooltip>
        </div>
        <div ref={collapsedBgColorPopoverRef} className="w-full flex justify-center">
          <Tooltip content="Цвет фона" as="div">
            <button
              ref={collapsedBgColorTriggerRef}
              type="button"
              onClick={() => toggleCollapsedColorMenu('background')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-black/10 text-sm font-semibold leading-none"
              style={{
                backgroundColor: normalizeHexColor(backgroundColor, '#FFFFFF'),
              }}
              aria-haspopup="dialog"
              aria-expanded={collapsedColorTarget === 'background'}
              aria-label="Цвет фона"
            >
              <span
                className="select-none text-white"
                style={{ mixBlendMode: 'difference', filter: 'contrast(180%) saturate(120%)' }}
              >
                B
              </span>
            </button>
          </Tooltip>
        </div>
        <input
          ref={previewBgFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-hidden
          onChange={handleCollapsedPreviewBackgroundFileChange}
        />
        <div className="grid w-full grid-cols-1 gap-2 pt-1">
          <Tooltip content="Поменять цвета местами" as="div" className="w-full">
            <button
              type="button"
              onClick={handleSwapColors}
              className="inline-flex h-8 w-full items-center justify-center rounded-md bg-gray-50 text-gray-700 transition-colors hover:bg-gray-50 hover:text-accent"
              aria-label="Поменять цвета текста и фона местами"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </Tooltip>
          <Tooltip content={previewBackgroundImage ? 'Убрать фоновое изображение' : 'Фоновое изображение'} as="div" className="w-full">
            <button
              type="button"
              onClick={() => {
                if (previewBackgroundImage) {
                  setPreviewBackgroundImage(null);
                  return;
                }
                previewBgFileInputRef.current?.click();
              }}
              className={`inline-flex h-8 w-full items-center justify-center rounded-md transition-colors ${
                previewBackgroundImage
                  ? 'bg-accent text-white hover:bg-accent-hover'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-50 hover:text-accent'
              }`}
              aria-label={previewBackgroundImage ? 'Убрать фоновое изображение' : 'Добавить фоновое изображение'}
            >
              {previewBackgroundImage ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                  <path d="M5.25328 11.3994C5.94429 9.90223 8.04865 9.83719 8.83043 11.2891L14.0199 20.9258L16.7572 16.0596C17.5218 14.7003 19.4789 14.7003 20.2435 16.0596L23.8714 22.5098C24.1422 22.9911 23.9718 23.6003 23.4906 23.8711C23.0093 24.1418 22.4001 23.9714 22.1293 23.4902L18.5004 17.04L15.763 21.9072C14.9903 23.2808 13.0054 23.2617 12.2582 21.874L7.06969 12.2373L1.90855 23.4189C1.67714 23.9203 1.08282 24.1395 0.581405 23.9082C0.0800149 23.6768 -0.139152 23.0825 0.0921474 22.5811L5.25328 11.3994Z" fill="currentColor" />
                  <path d="M17.0004 5C17.0004 6.65685 15.6572 8 14.0004 8C12.3435 8 11.0004 6.65685 11.0004 5C11.0004 3.34315 12.3435 2 14.0004 2C15.6572 2 17.0004 3.34315 17.0004 5Z" fill="currentColor" />
                </svg>
              )}
            </button>
          </Tooltip>
        </div>
      </div>
      <div className="-mx-2 grid grid-cols-1 gap-2 border-t border-gray-200 bg-white px-2 pt-3 pb-1">
        <div className="grid grid-cols-1 gap-2">
          {(quickPresetSections || []).flatMap(({ kind, presets }) =>
            (presets || []).map(({ key, label }) => {
              const presetKey = `${kind}:${key}`;
              const active = sidebarTextPreset === presetKey;
              return (
                <Tooltip key={presetKey} content={label} as="div" className="w-full">
                  <button
                    type="button"
                    onClick={() => pickSidebarTextPreset(kind, key)}
                    disabled={isGlyphsView}
                    className={`inline-flex h-8 w-full items-center justify-center rounded-md border transition-colors ${
                      active
                        ? 'border-accent bg-accent text-white'
                        : 'border-gray-200 bg-white text-gray-900 hover:border-black hover:bg-black hover:text-white'
                    } disabled:cursor-default disabled:opacity-40`}
                    aria-label={`Быстрый пресет: ${label}`}
                  >
                    <QuickPresetIcon kind={kind} itemKey={key} />
                  </button>
                </Tooltip>
              );
            }),
          )}
        </div>
      </div>
    </div>
    {isCollapsedStyleMenuOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={collapsedStyleMenuRef}
            className={`fixed z-[140] min-w-[12rem] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg ${
              collapsedStyleMenuPosition.ready ? 'opacity-100' : 'opacity-0'
            }`}
            role="menu"
            style={{
              top: `${collapsedStyleMenuPosition.top}px`,
              left: `${collapsedStyleMenuPosition.left}px`,
            }}
          >
            <div className="max-h-64 overflow-y-auto">
              {sidebarPresetOptions.map((option) => {
                const active =
                  String(option?.value || '') === String(collapsedStylePresetName || '');
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => {
                      const next = String(option?.value || '');
                      if (!next) return;
                      if (isWaterfallView) {
                        if (waterfallEditTarget === 'body') setWaterfallBodyPresetName(next);
                        else setWaterfallHeadingPresetName(next);
                      } else {
                        applyPresetStyle(next);
                      }
                      setIsCollapsedStyleMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold transition-colors ${
                      active ? 'bg-accent text-white' : 'text-gray-900 hover:bg-accent hover:text-white'
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate normal-case" style={option?.style || undefined}>
                      {option.label}
                    </span>
                    {option?.style?.fontWeight ? (
                      <span className="shrink-0 tabular-nums opacity-80">{String(option.style.fontWeight)}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )
      : null}
    {isCollapsedScaleMenuOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={collapsedScaleMenuRef}
            className={`fixed z-[140] min-w-[12rem] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg ${
              collapsedScaleMenuPosition.ready ? 'opacity-100' : 'opacity-0'
            }`}
            role="menu"
            style={{
              top: `${collapsedScaleMenuPosition.top}px`,
              left: `${collapsedScaleMenuPosition.left}px`,
            }}
          >
            <div className="max-h-64 overflow-y-auto">
              {waterfallScalePresets.map((preset) => {
                const active = preset.key === (activeWaterfallScalePreset?.key || '');
                return (
                  <button
                    key={preset.key}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => {
                      setWaterfallScaleSelectKey(preset.key);
                      setWaterfallScaleRatio(preset.ratio);
                      setIsCollapsedScaleMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold transition-colors ${
                      active ? 'bg-accent text-white' : 'text-gray-900 hover:bg-accent hover:text-white'
                    }`}
                  >
                    <span className="shrink-0 tabular-nums">{Number(preset.ratio).toFixed(3)}</span>
                    <span className="min-w-0 flex-1 truncate normal-case opacity-90">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )
      : null}
    {collapsedColorTarget && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={collapsedColorMenuRef}
            className={`fixed z-[145] w-[16rem] rounded-md border border-gray-200 bg-white p-3 shadow-lg ${
              collapsedColorMenuPosition.ready ? 'opacity-100' : 'opacity-0'
            }`}
            role="dialog"
            aria-label={collapsedColorTarget === 'background' ? 'Палитра цвета фона' : 'Палитра цвета текста'}
            style={{
              top: `${collapsedColorMenuPosition.top}px`,
              left: `${collapsedColorMenuPosition.left}px`,
            }}
          >
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-semibold uppercase text-gray-600">
                {collapsedColorTarget === 'background' ? 'Фон' : 'Текст'}
              </span>
              <button
                type="button"
                className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                onClick={() => setCollapsedColorTarget(null)}
                aria-label="Закрыть палитру"
              >
                ESC
              </button>
            </div>
            {collapsedColorTarget === 'foreground' || collapsedColorTarget === 'text' ? (
              <CollapsedColorEditor
                fieldRef={fgColorFieldRef}
                sliderRef={fgColorSliderRef}
                onFieldClick={(e) => handleColorFieldClick(e, false)}
                onFieldMouseDown={(e) => startColorDrag(e, 'field', false)}
                onSliderClick={(e) => handleColorSliderClick(e, false)}
                onSliderMouseDown={(e) => startColorDrag(e, 'slider', false)}
                fieldBackground={`linear-gradient(to right, white, ${getHueColor(parseFloat(fgSliderPos) * 3.6)}), linear-gradient(to bottom, transparent, black)`}
                previewColor={normalizeHexColor(textColor, '#000000')}
                colorPos={fgColorPos}
                sliderPos={fgSliderPos}
                sliderKnobColor={getHueColor(parseFloat(fgSliderPos) * 3.6)}
                colorMode={fgColorMode}
                onToggleMode={() => setFgColorMode((prev) => (prev === 'hex' ? 'rgb' : 'hex'))}
                colorValue={normalizeHexColor(textColor, '#000000')}
                onColorValueChange={setTextColor}
                onChannelChange={(ch, val) => handleRgbChannelChange(ch, val, false)}
                hexAriaLabel="Цвет текста, HEX"
              />
            ) : (
              <CollapsedColorEditor
                fieldRef={bgColorFieldRef}
                sliderRef={bgColorSliderRef}
                onFieldClick={(e) => handleColorFieldClick(e, true)}
                onFieldMouseDown={(e) => startColorDrag(e, 'field', true)}
                onSliderClick={(e) => handleColorSliderClick(e, true)}
                onSliderMouseDown={(e) => startColorDrag(e, 'slider', true)}
                fieldBackground={`linear-gradient(to right, white, ${getHueColor(parseFloat(bgSliderPos) * 3.6)}), linear-gradient(to bottom, transparent, black)`}
                previewColor={normalizeHexColor(backgroundColor, '#000000')}
                colorPos={bgColorPos}
                sliderPos={bgSliderPos}
                sliderKnobColor={getHueColor(parseFloat(bgSliderPos) * 3.6)}
                colorMode={bgColorMode}
                onToggleMode={() => setBgColorMode((prev) => (prev === 'hex' ? 'rgb' : 'hex'))}
                colorValue={normalizeHexColor(backgroundColor, '#000000')}
                onColorValueChange={setBackgroundColor}
                onChannelChange={(ch, val) => handleRgbChannelChange(ch, val, true)}
                hexAriaLabel="Цвет фона, HEX"
              />
            )}
          </div>,
          document.body,
        )
      : null}
    {collapsedCycleHint &&
    collapsedCycleHintRect &&
    typeof document !== 'undefined'
      ? createPortal(
          <div
            className="pointer-events-none fixed z-[150] rounded-md bg-black/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-white shadow-sm"
            style={{
              top: `${collapsedCycleHintRect.top + collapsedCycleHintRect.height / 2}px`,
              left: `${collapsedCycleHintRect.right + 14}px`,
              transform: 'translateY(-50%)',
            }}
            role="status"
            aria-live="polite"
          >
            {collapsedCycleHint}
          </div>,
          document.body,
        )
      : null}
    </>
  );
}

export default CollapsedSidebarControls;
