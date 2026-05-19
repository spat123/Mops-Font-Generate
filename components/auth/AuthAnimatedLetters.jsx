import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { formatFontVariationSettings } from '../../utils/fontVariationSettings';

const FAMILY = 'Roboto Flex';
const FONT_FAMILY_CSS = '"AuthRobotoFlex"';

let fontLoadPromise = null;
let axesPromise = null;

const FSM_TIMING = {
  /** После заглавной — появляется строчная. */
  showLowerDelayMs: 300,
  /** Полная пара на экране, пока крутятся оси VF. */
  pairHoldMs: 2000,
  /** Сначала гаснет строчная (маленькая). */
  fadeLowerMs: 180,
  /** Пауза между исчезновением строчной и началом гашения заглавной. */
  gapAfterLowerFadeMs: 30,
  /** Потом гаснет заглавная (большая). */
  fadeUpperMs: 220,
  /** Пауза после полного исчезновения пары — только потом новая заглавная. */
  gapBeforeNextMs: 200,
};

const AXES_TIMING = {
  holdMinMs: 850,
  holdMaxMs: 1600,
  tweenMinMs: 600,
  tweenMaxMs: 950,
};

/** После появления строчной — пауза с «замороженными» дефолтными осями, без мгновенного твина. */
const AXES_START_AFTER_LOWER_MS = 240;

/**
 * Обрезка строковой коробки по метрикам шрифта (аналог «по глифу» в Figma).
 * Актуальный синтаксис: text-box-trim — none | trim-start | trim-end | trim-both (не «both»).
 * Часто удобнее shorthand: text-box: trim-both cap alphabetic;
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/text-box
 */
const CENTER_GLYPH_TRIM_UPPER = '[text-box:trim-both_cap_alphabetic]';
const CENTER_GLYPH_TRIM_LOWER = '[text-box:trim-both_ex_alphabetic]';

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(Boolean(mq.matches));
    onChange();
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);
  return reduced;
}

async function ensureRobotoFlexLoaded() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (fontLoadPromise) return fontLoadPromise;

  fontLoadPromise = (async () => {
    const url = `/api/google-font-github-vf?family=${encodeURIComponent(FAMILY)}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Failed to load VF: ${r.status}`);
    const buf = await r.arrayBuffer();
    const face = new FontFace('AuthRobotoFlex', buf, { display: 'swap' });
    await face.load();
    document.fonts.add(face);
  })();

  return fontLoadPromise;
}

async function ensureAxesLoaded() {
  if (axesPromise) return axesPromise;
  axesPromise = (async () => {
    const url = `/api/google-font-family-axes?family=${encodeURIComponent(FAMILY)}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Failed to load axes: ${r.status}`);
    const j = await r.json();
    const axes = Array.isArray(j?.axes) ? j.axes : [];
    // slimGoogleMetadataAxes => { tag, min, max, defaultValue }
    const byTag = Object.fromEntries(
      axes
        .filter((a) => a && typeof a.tag === 'string')
        .map((a) => [a.tag, { min: a.min, max: a.max, defaultValue: a.defaultValue }]),
    );
    return byTag;
  })();
  return axesPromise;
}

/**
 * @param {'upper' | 'lower'} role — у строчной отдельный набор осей (в т.ч. slnt «италик»).
 */
function buildAuthAxisPicker(axesByTag, role) {
  const pick = (tag, fallback) => {
    const axis = axesByTag?.[tag];
    if (!axis) return fallback;
    return axis;
  };

  const niceRanges = {
    wght: (a) => ({ min: Math.max(a.min, 250), max: Math.min(a.max, 900) }),
    wdth: (a) => ({ min: Math.max(a.min, 70), max: Math.min(a.max, 130) }),
    slnt: (a) => ({ min: Math.max(a.min, -12), max: Math.min(a.max, 0) }),
    opsz: (a) => ({ min: Math.max(a.min, 8), max: Math.min(a.max, 80) }),
    GRAD: (a) => ({ min: Math.max(a.min, -80), max: Math.min(a.max, 150) }),
  };

  const supportedTags = Object.keys(axesByTag || {});
  const upperOrder = ['wght', 'wdth', 'opsz', 'GRAD'];
  const lowerOrder = ['wght', 'wdth', 'opsz', 'slnt', 'GRAD'];
  const order = role === 'lower' ? lowerOrder : upperOrder;
  const preferred = order.filter((t) => supportedTags.includes(t));

  const defaults = Object.fromEntries(
    preferred.map((tag) => {
      const a = pick(tag, null);
      const d = typeof a?.defaultValue === 'number' ? a.defaultValue : a?.min ?? 0;
      return [tag, d];
    }),
  );

  const randomTarget = () => {
    const next = {};
    for (const tag of preferred) {
      const a = pick(tag, null);
      if (!a) continue;
      const rangeFn = niceRanges[tag];
      const { min, max } = typeof rangeFn === 'function' ? rangeFn(a) : { min: a.min, max: a.max };
      if (!(Number.isFinite(min) && Number.isFinite(max) && max > min)) continue;
      const raw = min + Math.random() * (max - min);
      const quant = tag === 'wght' ? 1 : tag === 'wdth' ? 0.5 : tag === 'slnt' ? 0.25 : 0.1;
      next[tag] = Math.round(raw / quant) * quant;
    }
    return { preferred, defaults, next };
  };

  return { preferred, defaults, randomTarget };
}

function buildAlphabet(isRuGeo) {
  if (isRuGeo) {
    // Без Ё/Ъ/Ь по умолчанию.
    return 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЫЭЮЯ'.split('');
  }
  return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
}

export function AuthAnimatedLetters({ isRuGeo = false }) {
  const reducedMotion = usePrefersReducedMotion();
  const alphabet = useMemo(() => buildAlphabet(isRuGeo), [isRuGeo]);

  // Индекс текущей буквы в центре.
  const [centerIndex, setCenterIndex] = useState(1);
  /** upper — только заглавная; lower — пара; hidingLower / hidingUpper — поэтапное исчезновение */
  const [centerPhase, setCenterPhase] = useState(reducedMotion ? 'lower' : 'upper');

  const [axesByTag, setAxesByTag] = useState(null);
  const [vfReady, setVfReady] = useState(false);
  const [centerUpperFvs, setCenterUpperFvs] = useState('normal');
  const [centerLowerFvs, setCenterLowerFvs] = useState('normal');

  const fsmTimersRef = useRef([]);
  const axesTimersRef = useRef([]);
  const axesRafRef = useRef(0);

  const clearFsm = () => {
    for (const t of fsmTimersRef.current) clearTimeout(t);
    fsmTimersRef.current = [];
  };

  const clearAxes = () => {
    for (const t of axesTimersRef.current) clearTimeout(t);
    axesTimersRef.current = [];
    if (axesRafRef.current) cancelAnimationFrame(axesRafRef.current);
    axesRafRef.current = 0;
  };

  const stableDefaultUpperFvs = useMemo(() => {
    if (!axesByTag || typeof axesByTag !== 'object') return 'normal';
    const { preferred, defaults } = buildAuthAxisPicker(axesByTag, 'upper');
    if (!preferred.length) return 'normal';
    return formatFontVariationSettings(defaults, { fallback: 'normal' });
  }, [axesByTag]);

  const stableDefaultLowerFvs = useMemo(() => {
    if (!axesByTag || typeof axesByTag !== 'object') return 'normal';
    const { preferred, defaults } = buildAuthAxisPicker(axesByTag, 'lower');
    if (!preferred.length) return 'normal';
    return formatFontVariationSettings(defaults, { fallback: 'normal' });
  }, [axesByTag]);

  const topIndex = (centerIndex - 1 + alphabet.length) % alphabet.length;
  const bottomIndex = (centerIndex + 1) % alphabet.length;

  const topUpper = alphabet[topIndex] || 'A';
  const topLower = topUpper.toLowerCase();
  const centerUpper = alphabet[centerIndex % alphabet.length] || 'B';
  const centerLower = centerUpper.toLowerCase();
  const bottomUpper = alphabet[bottomIndex] || 'C';
  const bottomLower = bottomUpper.toLowerCase();

  // VF + axes bootstrap.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await ensureRobotoFlexLoaded();
        if (!cancelled) setVfReady(true);
      } catch {
        if (!cancelled) setVfReady(false);
      }
      try {
        const axes = await ensureAxesLoaded();
        if (!cancelled) setAxesByTag(axes);
      } catch {
        if (!cancelled) setAxesByTag({});
      }
    })();

    return () => {
      cancelled = true;
      clearFsm();
      clearAxes();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Сразу после смены буквы — только заглавная (до paint), без кадра «обе буквы».
  useLayoutEffect(() => {
    if (reducedMotion) {
      setCenterPhase('lower');
      return;
    }
    setCenterPhase('upper');
  }, [centerIndex, reducedMotion, alphabet.length]);

  // Пока только заглавная — дефолты для обеих ячеек (строчная скрыта, но FVS уже «своё» — без скачка).
  useLayoutEffect(() => {
    if (reducedMotion) return;
    if (centerPhase !== 'upper') return;
    setCenterUpperFvs(stableDefaultUpperFvs);
    setCenterLowerFvs(stableDefaultLowerFvs);
  }, [centerIndex, centerPhase, stableDefaultUpperFvs, stableDefaultLowerFvs, reducedMotion]);

  // FSM: upper → lower (оси только здесь) → hidingLower → hidingUpper → пауза → следующая буква
  useEffect(() => {
    clearFsm();
    if (reducedMotion) return;

    const t1 = window.setTimeout(() => setCenterPhase('lower'), FSM_TIMING.showLowerDelayMs);

    const tHideLowerAt = FSM_TIMING.showLowerDelayMs + FSM_TIMING.pairHoldMs;
    const t2 = window.setTimeout(() => setCenterPhase('hidingLower'), tHideLowerAt);

    const tHideUpperAt = tHideLowerAt + FSM_TIMING.fadeLowerMs + FSM_TIMING.gapAfterLowerFadeMs;
    const t3 = window.setTimeout(() => setCenterPhase('hidingUpper'), tHideUpperAt);

    const tNextAt =
      tHideUpperAt + FSM_TIMING.fadeUpperMs + FSM_TIMING.gapBeforeNextMs;
    const t4 = window.setTimeout(() => {
      setCenterIndex((v) => (v + 1) % alphabet.length);
      setCenterPhase('upper');
    }, tNextAt);

    fsmTimersRef.current.push(t1, t2, t3, t4);
    return () => clearFsm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerIndex, reducedMotion, alphabet.length]);

  // Оси VF — только пока видна полная пара (фаза lower). При исчезновении не сбрасываем FVS.
  useEffect(() => {
    clearAxes();
    if (reducedMotion) {
      setCenterUpperFvs('normal');
      setCenterLowerFvs('normal');
      return;
    }
    if (!vfReady) return;
    if (!axesByTag) return;
    if (centerPhase !== 'lower') {
      return;
    }

    const upperPicker = buildAuthAxisPicker(axesByTag, 'upper');
    const lowerPicker = buildAuthAxisPicker(axesByTag, 'lower');
    if (!upperPicker.preferred.length && !lowerPicker.preferred.length) return;

    let cancelled = false;
    let currentUpper = { ...upperPicker.defaults };
    let currentLower = { ...lowerPicker.defaults };

    const scheduleNext = () => {
      if (cancelled) return;
      const holdMs = AXES_TIMING.holdMinMs + Math.random() * (AXES_TIMING.holdMaxMs - AXES_TIMING.holdMinMs);
      const tweenMs = AXES_TIMING.tweenMinMs + Math.random() * (AXES_TIMING.tweenMaxMs - AXES_TIMING.tweenMinMs);
      const { next: nextUpper } = upperPicker.randomTarget();
      const { next: nextLower } = lowerPicker.randomTarget();
      const fromUpper = { ...currentUpper };
      const fromLower = { ...currentLower };
      const start = performance.now();

      const tick = (now) => {
        if (cancelled) return;
        const t = clamp((now - start) / tweenMs, 0, 1);
        const e = easeInOutCubic(t);
        const interpolatedUpper = {};
        for (const tag of upperPicker.preferred) {
          const a = fromUpper[tag];
          const b = nextUpper[tag];
          if (typeof a === 'number' && typeof b === 'number') interpolatedUpper[tag] = lerp(a, b, e);
        }
        const interpolatedLower = {};
        for (const tag of lowerPicker.preferred) {
          const a = fromLower[tag];
          const b = nextLower[tag];
          if (typeof a === 'number' && typeof b === 'number') interpolatedLower[tag] = lerp(a, b, e);
        }
        if (upperPicker.preferred.length) {
          setCenterUpperFvs(formatFontVariationSettings(interpolatedUpper, { fallback: 'normal' }));
        }
        if (lowerPicker.preferred.length) {
          setCenterLowerFvs(formatFontVariationSettings(interpolatedLower, { fallback: 'normal' }));
        }
        if (t < 1) {
          axesRafRef.current = requestAnimationFrame(tick);
        } else {
          if (upperPicker.preferred.length) currentUpper = { ...nextUpper };
          if (lowerPicker.preferred.length) currentLower = { ...nextLower };
          const tHold = window.setTimeout(scheduleNext, holdMs);
          axesTimersRef.current.push(tHold);
        }
      };

      axesRafRef.current = requestAnimationFrame(tick);
    };

    const tStart = window.setTimeout(() => {
      if (cancelled) return;
      currentUpper = { ...upperPicker.defaults };
      currentLower = { ...lowerPicker.defaults };
      scheduleNext();
    }, AXES_START_AFTER_LOWER_MS);
    axesTimersRef.current.push(tStart);

    return () => {
      cancelled = true;
      clearAxes();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axesByTag, vfReady, reducedMotion, centerPhase]);

  const showLowerChar = reducedMotion || centerPhase === 'lower' || centerPhase === 'hidingLower';
  const lowerCellOpacity = reducedMotion ? 1 : centerPhase === 'lower' ? 1 : centerPhase === 'hidingLower' ? 0 : 0;
  const upperCellOpacity = reducedMotion ? 1 : centerPhase === 'hidingUpper' ? 0 : 1;

  /** Внешняя ячейка — только сетка; глиф внутри с text-box-* для метрик как у «glyph bounds». */
  const centerCellFontSize = 'clamp(10rem, 14vw, 20rem)';
  const centerCellWidth = 'clamp(7rem, 10vw, 14rem)';
  const centerCellOuterStyle = {
    width: centerCellWidth,
    minWidth: centerCellWidth,
    maxWidth: centerCellWidth,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  const centerGlyphInnerStyle = {
    fontSize: centerCellFontSize,
    lineHeight: 1,
    letterSpacing: '-0.02em',
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col">
      <div className="relative flex min-h-0 w-full flex-1 flex-col select-none [font-feature-settings:normal]" style={{ fontFamily: vfReady ? FONT_FAMILY_CSS : undefined }}>
        <div className="relative mx-auto flex w-full max-w-[26rem] flex-1 flex-col px-0 py-6 md:py-8">
          {/*
            Три ряда: предыдущая / центр / следующая — через flex + justify-between,
            иначе огромный центр с absolute перекрывает верх/низ и кажется, что «ничего не меняется».
          */}
          <div className="relative flex min-h-[min(520px,60vh)] w-full flex-1 flex-col justify-between">
            <div className="relative z-10 flex shrink-0 justify-center pt-1 md:pt-2">
              <div className="flex items-baseline gap-2 text-black">
                <span className="text-3xl font-semibold tracking-tight md:text-4xl">{topUpper}</span>
                <span className="text-xl font-semibold tracking-tight md:text-2xl">{topLower}</span>
              </div>
            </div>

            <div className="relative z-0 flex min-h-0 flex-1 items-center justify-center text-black">
              <div className="flex flex-row items-baseline justify-center gap-14">
                <span
                  className="shrink-0 [font-feature-settings:normal] [font-synthesis:none]"
                  style={{
                    ...centerCellOuterStyle,
                    opacity: upperCellOpacity,
                    transition: `opacity ${FSM_TIMING.fadeUpperMs}ms ease`,
                  }}
                >
                  <span
                    className={`inline-block [font-feature-settings:normal] [font-synthesis:none] ${CENTER_GLYPH_TRIM_UPPER}`}
                    style={{
                      ...centerGlyphInnerStyle,
                      fontVariationSettings: centerUpperFvs,
                    }}
                  >
                    {centerUpper}
                  </span>
                </span>
                <span
                  className="shrink-0 [font-feature-settings:normal] [font-synthesis:none]"
                  style={{
                    ...centerCellOuterStyle,
                    opacity: lowerCellOpacity,
                    transition: `opacity ${FSM_TIMING.fadeLowerMs}ms ease`,
                  }}
                  aria-hidden={!showLowerChar}
                >
                  <span
                    className={`inline-block [font-feature-settings:normal] [font-synthesis:none] ${CENTER_GLYPH_TRIM_LOWER}`}
                    style={{
                      ...centerGlyphInnerStyle,
                      fontVariationSettings: centerLowerFvs,
                    }}
                  >
                    {showLowerChar ? centerLower : '\u00a0'}
                  </span>
                </span>
              </div>
            </div>

            <div className="relative z-10 flex shrink-0 justify-center pb-1 md:pb-2">
              <div className="flex items-baseline gap-2 text-black">
                <span className="text-3xl font-semibold tracking-tight md:text-4xl">{bottomUpper}</span>
                <span className="text-xl font-semibold tracking-tight md:text-2xl">{bottomLower}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

