import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useFontContext } from '../contexts/FontContext';
import { toast } from '../utils/appNotify';
import { hasSignificantChanges } from '../utils/cssGenerator';
import { variableFontShowsItalicControl } from '../utils/fontUtilsCommon';
import DraggableValueRangeSlider from './ui/DraggableValueRangeSlider';
import { SegmentedControl } from './ui/SegmentedControl';
import { Tooltip } from './ui/Tooltip';
import { IconCircleButton } from './ui/IconCircleButton';

// Helper to truncate long labels with ellipsis.
const truncateText = (text, maxLength = 15) => {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

// Max axis name length before truncation.
const AXIS_NAME_MAX_LENGTH = 22;

const AXIS_ANIMATION_MULTIPLIERS = [1, 2, 3];

export default function VariableFontControls({ font, onSettingsChange, isAnimating = false, toggleAnimation }) {
  const [axes, setAxes] = useState([]);
  const [settings, setSettings] = useState({});
  const [animationDirections, setAnimationDirections] = useState({});
  const [axisAnimationMultipliers, setAxisAnimationMultipliers] = useState({});
  const animationRef = useRef(null);
  /** Snapshot of values/directions during animation to avoid setState on each frame. */
  const animSettingsRef = useRef({});
  const animDirectionsRef = useRef({});
  const axesRef = useRef([]);
  const animationStepsRef = useRef({});
  const handleVariableSettingsChangeRef = useRef(null);
  const onSettingsChangeRef = useRef(null);
  const prevIsAnimatingRef = useRef(isAnimating);
  const isUpdatingFromExternal = useRef(false);
  // Track currently edited marker.
  const [editingAxis, setEditingAxis] = useState(null);
  
  // Keep loaded font ID to avoid repeated initialization.
  const loadedFontId = useRef(null);
  
  const {
    getVariableAxes,
    handleVariableSettingsChange,
    variableSettings,
    resetVariableSettings,
    setSelectedFont,
    setFonts,
    saveFontSettings,
  } = useFontContext();

  handleVariableSettingsChangeRef.current = handleVariableSettingsChange;
  onSettingsChangeRef.current = onSettingsChange;

  // Previous settings snapshot for comparison.
  const prevSettingsRef = useRef({});

  // Sync local state with global variableSettings.
  useEffect(() => {
    // Ignore updates coming from external source.
    if (isUpdatingFromExternal.current) {
      isUpdatingFromExternal.current = false;
      return;
    }
    
    // Update only when settings differ.
    if (JSON.stringify(settings) !== JSON.stringify(variableSettings)) {
      setSettings(variableSettings);
    }
  }, [variableSettings]);
  
  const updateFontStyleState = useCallback((targetStyle) => {
    const normalizedStyle = targetStyle === 'italic' ? 'italic' : 'normal';
    const liveWeight =
      Number.isFinite(Number(settings?.wght))
        ? Math.round(Number(settings.wght))
        : Number.isFinite(Number(font?.currentWeight))
          ? Math.round(Number(font.currentWeight))
          : Number.isFinite(Number(font?.variableAxes?.wght?.default))
            ? Math.round(Number(font.variableAxes.wght.default))
            : 400;

    setSelectedFont((prev) => {
      if (!prev || prev.id !== font?.id) return prev;
      return {
        ...prev,
        currentStyle: normalizedStyle,
        currentWeight: liveWeight,
      };
    });

    setFonts((currentFonts) => {
      if (!Array.isArray(currentFonts)) return currentFonts;
      return currentFonts.map((f) => (
        f.id === font?.id
          ? {
              ...f,
              currentStyle: normalizedStyle,
              currentWeight: liveWeight,
              lastUsedPresetName: null,
            }
          : f
      ));
    });

    saveFontSettings?.(font?.id, {
      currentStyle: normalizedStyle,
      currentWeight: liveWeight,
      lastUsedPresetName: null,
    });
  }, [font, saveFontSettings, setFonts, setSelectedFont, settings]);
  
  // Optimized effect to load font axes.
  useEffect(() => {
    // Guard for empty font.
    if (!font) {
      setAxes([]);
      return;
    }

    // Font ID for change tracking.
    const fontId = font.id ? font.id : null;
    
    // Fast exit for known non-variable fonts.
    if (font.isVariableFont === false) {
      setAxes([]);
      return;
    }

    // PRIORITY 1: axes already present in font object.
    if (font.variableAxes && Object.keys(font.variableAxes).length > 0) {
      // Convert variableAxes map to list for rendering.
      const fontAxes = Object.entries(font.variableAxes).map(([tag, axisData]) => {
        // Use metadata name or fallback to tag.
        let name = axisData.name || tag;
        
        // Use min/max/default directly from axis data.
        return {
          tag,
          name,
          min: axisData.min,
          max: axisData.max,
          default: axisData.default
        };
      });
      
      // Filter by supported axes when provided.
      let filteredAxes = fontAxes;
      if (font.supportedAxes && Array.isArray(font.supportedAxes) && font.supportedAxes.length > 0) {
        // Keep only axes listed in supportedAxes.
        filteredAxes = fontAxes.filter(axis => 
          font.supportedAxes.includes(axis.tag)
        );
        
        if (filteredAxes.length === 0 && fontAxes.length > 0) {
          filteredAxes = fontAxes;
        }
      }
      
      // If there are axes to show, update state.
      if (filteredAxes.length > 0) {
        setAxes(filteredAxes);
        
        // Reinitialize values when font ID changes.
        if (fontId !== loadedFontId.current) {
          loadedFontId.current = fontId;
          
          // Initialize settings from axis defaults.
          const initialSettings = {};
          const initialDirections = {};
          
          // Use filtered axes only.
          filteredAxes.forEach(axis => {
            // Initial value equals axis default.
            initialSettings[axis.tag] = axis.default;
            initialDirections[axis.tag] = 1;
          });
          
          // Sync local states.
          setSettings(initialSettings);
          setAnimationDirections(initialDirections);
        }
        
        return;
      }
    }
    
    // PRIORITY 2/3: getVariableAxes from context.
    const loadFontAxes = async () => {
      try {
        // Load axes through centralized function.
        const fontAxes = await getVariableAxes(font);
        
        if (!fontAxes || fontAxes.length === 0) {
          setAxes([]);
          return;
        }
        
        setAxes(fontAxes);
        
        // Reinitialize when font ID changes.
        if (fontId !== loadedFontId.current) {
          loadedFontId.current = fontId;
          
          // Set initial values from axes.
          const initialSettings = {};
          const initialDirections = {};
          
          fontAxes.forEach(axis => {
            initialSettings[axis.tag] = axis.default;
            initialDirections[axis.tag] = 1;
          });
          
          // Sync local states.
          setSettings(initialSettings);
          setAnimationDirections(initialDirections);
        }
      } catch (error) {
        toast.error('Не удалось проанализировать шрифт. Возможно, он не является вариативным или поврежден.');
        setAxes([]);
      }
    };
    
    loadFontAxes();

    // Cleanup animation on unmount.
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [font, getVariableAxes]);

  useEffect(() => {
    axesRef.current = axes;
  }, [axes]);

  useEffect(() => {
    setAxisAnimationMultipliers((prev) =>
      axes.reduce((acc, axis) => {
        const current = Number(prev?.[axis.tag]);
        acc[axis.tag] = AXIS_ANIMATION_MULTIPLIERS.includes(current) ? current : 1;
        return acc;
      }, {})
    );
  }, [axes]);

  // Memoized axis animation step map to avoid recalculations on each render.
  const animationSteps = useMemo(() => {
    return axes.reduce((steps, axis) => {
      const multiplier = axisAnimationMultipliers[axis.tag] ?? 1;
      steps[axis.tag] = ((axis.max - axis.min) / 100) * multiplier;
      return steps;
    }, {});
  }, [axes, axisAnimationMultipliers]);

  useEffect(() => {
    animationStepsRef.current = animationSteps;
  }, [animationSteps]);

  // Snapshot on start and full apply on stop.
  useEffect(() => {
    const wasAnimating = prevIsAnimatingRef.current;
    prevIsAnimatingRef.current = isAnimating;

    if (isAnimating && !wasAnimating) {
      animSettingsRef.current = { ...settings };
      axes.forEach((axis) => {
        animDirectionsRef.current[axis.tag] = animationDirections[axis.tag] ?? 1;
      });
    }

    if (!isAnimating && wasAnimating) {
      const final = animSettingsRef.current;
      isUpdatingFromExternal.current = true;
      handleVariableSettingsChange(final, true);
      if (typeof onSettingsChange === 'function') {
        onSettingsChange(final);
      }
      setSettings(final);
      setAnimationDirections({ ...animDirectionsRef.current });
    }
  }, [isAnimating, settings, animationDirections, axes, handleVariableSettingsChange, onSettingsChange]);

  /** Stable callback: not dependent on settings/directions to avoid rAF reset each frame. */
  const animateAxes = useCallback(() => {
    const ax = axesRef.current;
    const steps = animationStepsRef.current;
    const newSettings = { ...animSettingsRef.current };
    let hasChanges = false;

    ax.forEach((axis) => {
      const tag = axis.tag;
      const current = newSettings[tag] ?? axis.default;
      const direction = animDirectionsRef.current[tag] ?? 1;
      const step = steps[tag];
      let newValue = current + step * direction;

      if (newValue >= axis.max) {
        newValue = axis.max;
        animDirectionsRef.current[tag] = -1;
      } else if (newValue <= axis.min) {
        newValue = axis.min;
        animDirectionsRef.current[tag] = 1;
      }

      if (newValue !== current) {
        newSettings[tag] = newValue;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      animSettingsRef.current = newSettings;
      isUpdatingFromExternal.current = true;
      const apply = handleVariableSettingsChangeRef.current;
      if (typeof apply === 'function') {
        apply(newSettings, false, null, { skipSideEffects: true });
      }
      onSettingsChangeRef.current?.(newSettings);
    }

    animationRef.current = requestAnimationFrame(animateAxes);
  }, []);

  // Single continuous rAF loop while animation is active.
  useEffect(() => {
    if (isAnimating && axes.length > 0) {
      if (!animationRef.current) {
        animationRef.current = requestAnimationFrame(animateAxes);
      }
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
      };
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, [isAnimating, axes.length, animateAxes]);

  // Optimized slider value change handler.
  const handleSliderChange = useCallback((tag, value, isDragging = false) => {
    if (!settings || !tag) return 0;
    
    // Ignore while animating or while another axis is being edited.
    if (isAnimating || (editingAxis && editingAxis !== tag)) return 0;
    
    // Round value to integer.
    const roundedValue = Math.round(value);
    
    // Skip if value didn't change.
    if (settings[tag] === roundedValue) {
      return roundedValue;
    }
    
    // Create a new settings object.
    const newSettings = { ...settings, [tag]: roundedValue };
    
    // For dragging mode, apply threshold to reduce update frequency.
    const isSignificant = !isDragging || hasSignificantChanges(prevSettingsRef.current, newSettings, 3);
    
    // In drag mode with minor changes, update local state only.
    if (isDragging && !isSignificant) {
      setSettings(newSettings);
      return roundedValue;
    }
    
    setSettings(newSettings);
    
    // Store settings snapshot for the next comparison.
    prevSettingsRef.current = { ...newSettings };
    
    // Mark update as local.
    isUpdatingFromExternal.current = true;
    
    // While dragging, use lightweight updates.
    if (isDragging) {
      // Lightweight update during drag (without full rerender).
      handleVariableSettingsChange(newSettings, false);
    } else {
      // For regular clicks, run full update with rerender.
      handleVariableSettingsChange(newSettings, true);
    }

    // Notify parent about changes.
    if (typeof onSettingsChange === 'function') {
      onSettingsChange(newSettings);
    }
    
    return roundedValue;
  }, [settings, handleVariableSettingsChange, onSettingsChange, isAnimating, editingAxis]);
  
  // Reset all sliders to default values.
  const handleResetAll = useCallback(() => {
    // Ensure axes exist before reset.
    if (axes.length === 0) {
      return;
    }
    
    // Stop animation if active.
    if (isAnimating && typeof toggleAnimation === 'function') {
      toggleAnimation();
    }
    
    // Force cleanup animation frame.
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Build default axis values map.
    const defaultSettings = {};
    
    axes.forEach(axis => {
      defaultSettings[axis.tag] = axis.default;
    });
    
    // Reset animation directions.
    const defaultDirections = {};
    axes.forEach(axis => {
      defaultDirections[axis.tag] = 1;
    });
    
    // Update local state.
    setSettings(defaultSettings);
    setAnimationDirections(defaultDirections);
    setAxisAnimationMultipliers(
      axes.reduce((acc, axis) => {
        acc[axis.tag] = 1;
        return acc;
      }, {})
    );
    
    // Mark update as local.
    isUpdatingFromExternal.current = true;
    
    // Use context reset for centralized handling.
    resetVariableSettings();
    updateFontStyleState('normal');
    
    // Notify parent about reset.
    if (typeof onSettingsChange === 'function') {
      onSettingsChange(defaultSettings);
    }
    
    toast.info('Все настройки сброшены до значений по умолчанию');
  }, [axes, isAnimating, toggleAnimation, resetVariableSettings, onSettingsChange, updateFontStyleState]);

  const cycleAxisAnimationMultiplier = useCallback((tag) => {
    setAxisAnimationMultipliers((prev) => {
      const current = prev[tag] ?? 1;
      const currentIndex = AXIS_ANIMATION_MULTIPLIERS.indexOf(current);
      const nextMultiplier =
        currentIndex >= 0
          ? AXIS_ANIMATION_MULTIPLIERS[(currentIndex + 1) % AXIS_ANIMATION_MULTIPLIERS.length]
          : 1;
      return {
        ...prev,
        [tag]: nextMultiplier,
      };
    });
  }, []);

  // Memoized list of axes for UI display.
  const axesForDisplay = useMemo(() => {
    if (!Array.isArray(axes)) return [];
    if (font?.italicMode === 'axis-ital') {
      // For axis-ital mode, hide `ital` slider to avoid duplicate UI.
      return axes.filter((axis) => axis?.tag !== 'ital');
    }
    return axes;
  }, [axes, font?.italicMode]);
  const hasAxes = useMemo(() => axesForDisplay.length > 0, [axesForDisplay]);
  const canShowItalicControl = useMemo(() => variableFontShowsItalicControl(font), [font]);
  const italicControlValue = useMemo(() => {
    if (!canShowItalicControl) return '0';
    if (font?.italicMode === 'axis-ital') {
      return Number(settings?.ital ?? font?.variableAxes?.ital?.default ?? 0) >= 1 ? '1' : '0';
    }
    return font?.currentStyle === 'italic' ? '1' : '0';
  }, [canShowItalicControl, font, settings]);
  const handleItalicToggle = useCallback((nextValue) => {
    if (!font || isAnimating) return;
    const wantsItalic = nextValue === '1';
    const targetStyle = wantsItalic ? 'italic' : 'normal';

    if (font.italicMode === 'axis-ital') {
      const nextSettings = { ...settings, ital: wantsItalic ? 1 : 0 };
      setSettings(nextSettings);
      prevSettingsRef.current = { ...nextSettings };
      isUpdatingFromExternal.current = true;
      handleVariableSettingsChange(nextSettings, true);
      onSettingsChangeRef.current?.(nextSettings);
      updateFontStyleState(targetStyle);
      return;
    }

    if (font.italicMode === 'axis-slnt') {
      const slantAxis = typeof font.variableAxes?.slnt === 'object' ? font.variableAxes.slnt : null;
      const targetSlnt = wantsItalic ? (slantAxis?.min ?? -10) : (slantAxis?.default ?? 0);
      const nextSettings = { ...settings, slnt: Math.round(Number(targetSlnt)) };
      setSettings(nextSettings);
      prevSettingsRef.current = { ...nextSettings };
      isUpdatingFromExternal.current = true;
      handleVariableSettingsChange(nextSettings, true);
      onSettingsChangeRef.current?.(nextSettings);
      updateFontStyleState(targetStyle);
      return;
    }

    updateFontStyleState(targetStyle);
  }, [font, handleVariableSettingsChange, isAnimating, settings, updateFontStyleState]);

  if (!hasAxes && !canShowItalicControl) {
    return (
      <div className="text-sm text-gray-500 p-4 border border-gray-200 rounded-md bg-white text-center">
        Шрифт не имеет вариативных осей
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-3.5 flex min-w-0 items-center justify-between gap-2">
        <h2 className="min-w-0 shrink uppercase font-semibold text-sm text-gray-900">Variable Axes</h2>
        <div className="flex shrink-0 items-center gap-2">
          <Tooltip content={isAnimating ? 'Остановить анимацию' : 'Воспроизвести анимацию'}>
            <IconCircleButton
              variant="toolbar"
              pressed={isAnimating}
              onClick={toggleAnimation}
              aria-label={isAnimating ? 'Остановить анимацию' : 'Воспроизвести анимацию'}
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
            </IconCircleButton>
          </Tooltip>

          <Tooltip content="Сбросить все оси">
            <IconCircleButton variant="toolbar" onClick={handleResetAll} aria-label="Сбросить все оси">
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
            </IconCircleButton>
          </Tooltip>
        </div>
      </div>

      {canShowItalicControl ? (
        <div className="mb-3.5">
          <SegmentedControl
            variant="surface"
            value={italicControlValue}
            onChange={handleItalicToggle}
            disabled={isAnimating}
            options={[
              { value: '0', label: 'Roman', title: 'Roman (0)' },
              { value: '1', label: 'Italic', title: 'Italic (1)' },
            ]}
          />
        </div>
      ) : null}

      {axesForDisplay.map(axis => {
        const value = settings[axis.tag] !== undefined ? settings[axis.tag] : axis.default;
        const axisAnimationMultiplier = axisAnimationMultipliers[axis.tag] ?? 1;
        
        // Resolve axis name from possible formats.
        const axisName = typeof axis.name === 'object' 
          ? (axis.name.en || Object.values(axis.name)[0] || axis.tag) 
          : (axis.name || axis.tag);
        
        // Truncate long axis names.
        const truncatedName = truncateText(axisName, AXIS_NAME_MAX_LENGTH);
        
        return (
          <div key={axis.tag} className="mb-3.5">
            <div className="flex justify-between mb-0.5">
              <div className="text-[0.75rem] font-medium text-gray-600 flex items-center h-5 max-w-[75%] hover:text-gray-950 transition-colors">
                <Tooltip content={axisName} className="min-w-0">
                  <span className="truncate mr-1">{truncatedName}</span>
                </Tooltip>
                <span className="text-[0.7rem] font-normal text-gray-500 px-0.5 py-px rounded-sm whitespace-nowrap flex-shrink-0 leading-tight">({axis.tag})</span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <Tooltip content="Скорость анимации оси">
                  <button
                    type="button"
                    className="min-w-[1rem] text-right text-[0.75rem] font-normal text-gray-800 transition-colors hover:text-accent"
                    onClick={() => cycleAxisAnimationMultiplier(axis.tag)}
                    aria-label={`Скорость анимации оси ${axisName}: x${axisAnimationMultiplier.toFixed(1)}`}
                  >
                    {`x${axisAnimationMultiplier.toFixed(1)}`}
                  </button>
                </Tooltip>
                <Tooltip content="Сбросить к значению по умолчанию">
                  <button 
                    className={`text-gray-800 hover:text-accent w-4 h-4 flex items-center justify-center ${isAnimating ? 'opacity-50 cursor-default' : ''}`}
                    onClick={() => {
                      if (!isAnimating) {
                        handleSliderChange(axis.tag, axis.default);
                      }
                    }}
                    disabled={isAnimating}
                    aria-label="Сбросить к значению по умолчанию"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                    </svg>
                  </button>
                </Tooltip>
              </div>
            </div>
            
            <DraggableValueRangeSlider
              min={axis.min}
              max={axis.max}
              step={1}
              value={value}
              disabled={isAnimating}
              defaultMarkerValue={axis.default}
              formatDisplay={(v) => String(Math.round(v))}
              interactionLockId={axis.tag}
              onInteractionLock={setEditingAxis}
              onChange={(v) => handleSliderChange(axis.tag, v, false)}
              onMarkerDrag={(v) => handleSliderChange(axis.tag, v, true)}
              onMarkerDragEnd={(v) => {
                const rounded = Math.round(v);
                const currentSettings = { ...settings, [axis.tag]: rounded };
                handleVariableSettingsChange(currentSettings, true);
              }}
            />
          </div>
        );
      })}
    </div>
  );
} 

