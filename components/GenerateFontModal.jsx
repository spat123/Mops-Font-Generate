import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from '../utils/appNotify';
import { CustomSelect } from './ui/CustomSelect';
import { NATIVE_SELECT_FIELD_INTERACTIVE, customSelectTriggerClass } from './ui/nativeSelectFieldClasses';
import DraggableValueRangeSlider from './ui/DraggableValueRangeSlider';
import { PopupDialogHeader } from './ui/PopupDialogHeader';
import { AppButton } from './ui/AppButton';
import { Tooltip } from './ui/Tooltip';
import { EditAssetIcon } from './ui/EditAssetIcon';
import { updateIconUrl } from './ui/editIconUrls';
import { useLibraryAuth } from '../contexts/LibraryAuthContext';
import {
  FREE_STATIC_GENERATIONS_LIMIT,
  GUEST_STATIC_GENERATIONS_LIMIT,
  getStaticGenerationsAvailabilityMessage,
  getStaticGenerationsLimit,
  readFreeStaticGenerationsUsed,
  writeFreeStaticGenerationsUsed,
} from '../utils/freeStaticGenerationQuota';
import { isDevUnlimitedStaticGeneration } from '../utils/devUnlimitedStaticGeneration';
import { guessSubfamilyForVariableFont, variableFontHasItalicAxis } from '../utils/guessStaticSubfamily';
import { sanitizeVariableSettingsForInstancer } from '../utils/sanitizeVariableSettingsForInstancer';
import { getBillingCopy } from '../utils/billingCopy';

const SUBFAMILY_CUSTOM_VALUE = '__custom__';
const SUBFAMILY_PRESETS = [
  'Thin',
  'ExtraLight',
  'Light',
  'Regular',
  'Medium',
  'SemiBold',
  'Bold',
  'ExtraBold',
  'Black',
  'Thin Italic',
  'ExtraLight Italic',
  'Light Italic',
  'Italic',
  'Medium Italic',
  'SemiBold Italic',
  'Bold Italic',
  'ExtraBold Italic',
  'Black Italic',
];

const WEIGHT_CUSTOM_AUTO = '__auto__';
const WEIGHT_CUSTOM_OPTIONS = [
  { value: WEIGHT_CUSTOM_AUTO, label: 'Авто' },
  { value: '100', label: '100' },
  { value: '200', label: '200' },
  { value: '300', label: '300' },
  { value: '400', label: '400' },
  { value: '500', label: '500' },
  { value: '600', label: '600' },
  { value: '700', label: '700' },
  { value: '800', label: '800' },
  { value: '900', label: '900' },
];

function slugFileBase(name) {
  const s = String(name || 'font')
    .trim()
    .replace(/\.[a-zA-Z0-9]+$/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\-_]/g, '')
    .slice(0, 80);
  return s || 'font';
}

function formatAxisValue(value) {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
}

function mimeForFormat(format) {
  switch (String(format).toLowerCase()) {
    case 'ttf':
      return 'font/ttf';
    case 'otf':
      return 'font/otf';
    case 'woff':
      return 'font/woff';
    case 'woff2':
      return 'font/woff2';
    default:
      return 'font/ttf';
  }
}

/**
 * Генерация статического файла из VF: имя, формат, при необходимости правка веса (wght).
 */
export default function GenerateFontModal({
  isOpen,
  onClose,
  selectedFont,
  variableSettings,
  generateStaticFontFile,
  downloadFile,
}) {
  const { data: session } = useSession();
  const { authLoading, isAuthenticated, isPro, requestSignIn, openPlans } = useLibraryAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [outputName, setOutputName] = useState('');
  const [subfamilyPreset, setSubfamilyPreset] = useState('Regular');
  const [customSubfamily, setCustomSubfamily] = useState('');
  const [customWeightClass, setCustomWeightClass] = useState(WEIGHT_CUSTOM_AUTO);
  const [format, setFormat] = useState('woff2');
  const [genSettings, setGenSettings] = useState({});
  const [busy, setBusy] = useState(false);
  const [expandedAxis, setExpandedAxis] = useState(null);
  const [freeGenerationsUsed, setFreeGenerationsUsed] = useState(0);
  const wasOpenRef = useRef(false);

  const wghtAxis = selectedFont?.variableAxes?.wght;
  const hasWght = wghtAxis && typeof wghtAxis === 'object';

  const sessionUserId = useMemo(() => String(session?.user?.id || '').trim(), [session?.user?.id]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      setTimeout(() => {
        document.body.style.overflow = '';
      }, 300);
    }
  }, [isOpen]);

  const defaultOutputName = useMemo(() => {
    if (!selectedFont) return 'font';
    return slugFileBase(selectedFont.name || selectedFont.fontFamily || 'MyFont');
  }, [selectedFont]);

  const derivedSubfamily = useMemo(() => {
    if (subfamilyPreset === SUBFAMILY_CUSTOM_VALUE) {
      const raw = String(customSubfamily || '').trim();
      return raw || 'Regular';
    }
    return String(subfamilyPreset || 'Regular').trim() || 'Regular';
  }, [customSubfamily, subfamilyPreset]);

  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (justOpened && selectedFont) {
      setOutputName(defaultOutputName);
      const guessed = guessSubfamilyForVariableFont(
        variableSettings && typeof variableSettings === 'object' ? variableSettings : {},
        selectedFont,
      );
      const preset = SUBFAMILY_PRESETS.includes(guessed) ? guessed : SUBFAMILY_CUSTOM_VALUE;
      setSubfamilyPreset(preset);
      setCustomSubfamily(preset === SUBFAMILY_CUSTOM_VALUE ? guessed : '');
      setCustomWeightClass(WEIGHT_CUSTOM_AUTO);
      setGenSettings({ ...(variableSettings && typeof variableSettings === 'object' ? variableSettings : {}) });
      setFormat('woff2');
      setBusy(false);
      setExpandedAxis(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- снимок variableSettings только при открытии
  }, [isOpen, selectedFont, defaultOutputName]);

  useEffect(() => {
    if (!isOpen) return;
    setFreeGenerationsUsed(readFreeStaticGenerationsUsed(sessionUserId || null));
  }, [isOpen, sessionUserId]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const axisRows = useMemo(() => {
    const axes = selectedFont?.variableAxes;
    if (!axes || typeof axes !== 'object') return [];
    const settings = genSettings && typeof genSettings === 'object' ? genSettings : {};
    return Object.entries(axes)
      .filter(([tag, axis]) => tag && axis && typeof axis === 'object')
      .map(([tag, axis]) => {
        const raw = settings[tag];
        const fallback = axis?.default ?? axis?.min ?? 0;
        const value = typeof raw === 'number' ? raw : Number.isFinite(Number(raw)) ? Number(raw) : fallback;
        return {
          tag: String(tag),
          value,
          editable: String(tag).toLowerCase() === 'wght' && hasWght,
        };
      })
      .sort((a, b) => a.tag.localeCompare(b.tag));
  }, [genSettings, hasWght, selectedFont?.variableAxes]);

  const subfamilyPresetOptions = useMemo(() => {
    const allowItalic = variableFontHasItalicAxis(selectedFont?.variableAxes);
    return [
      ...SUBFAMILY_PRESETS.filter((label) => {
        if (!allowItalic && /italic/i.test(label)) return false;
        return true;
      }).map((label) => ({ value: label, label })),
      { value: SUBFAMILY_CUSTOM_VALUE, label: 'Своё значение…' },
    ];
  }, [selectedFont?.variableAxes]);

  useEffect(() => {
    if (!isOpen || !selectedFont) return;
    if (subfamilyPreset === SUBFAMILY_CUSTOM_VALUE) return;
    const guessed = guessSubfamilyForVariableFont(genSettings, selectedFont);
    const preset = SUBFAMILY_PRESETS.includes(guessed) ? guessed : SUBFAMILY_CUSTOM_VALUE;
    setSubfamilyPreset(preset);
    if (preset === SUBFAMILY_CUSTOM_VALUE) setCustomSubfamily(guessed);
  }, [genSettings, isOpen, selectedFont, subfamilyPreset]);

  const handleBackdropMouseDown = (e) => {
    /** Только реальный клик по затемнению: не закрываем при отпускании кнопки мыши после выделения текста в инпуте (mouseup на оверлее). */
    if (e.target !== e.currentTarget) return;
    if (e.button !== 0) return;
    onClose();
  };

  const devUnlimitedGenerations = isDevUnlimitedStaticGeneration();
  const generationsLimit =
    isPro || devUnlimitedGenerations ? Infinity : getStaticGenerationsLimit(sessionUserId || null);

  const handleGenerate = async () => {
    if (!selectedFont?.isVariableFont) {
      toast.error('Выберите вариативный шрифт');
      return;
    }
    if (!isPro && !devUnlimitedGenerations && freeGenerationsUsed >= generationsLimit) {
      if (!isAuthenticated) {
        toast.info('Вы исчерпали лимит генераций. Войдите в аккаунт — на Free будет 50 генераций в месяц.');
        requestSignIn?.();
        return;
      }
      toast.info(getBillingCopy().generationLimitToast);
      openPlans?.();
      return;
    }
    const familyRaw = String(outputName || '').trim() || 'font';
    const subfamilyRaw = String(derivedSubfamily || '').trim() || 'Regular';
    const weightClassAuto =
      typeof genSettings?.wght === 'number' && Number.isFinite(genSettings.wght)
        ? Math.max(1, Math.min(1000, Math.round(genSettings.wght)))
        : null;
    const weightClassManual =
      subfamilyPreset === SUBFAMILY_CUSTOM_VALUE && customWeightClass !== WEIGHT_CUSTOM_AUTO
        ? Number(customWeightClass)
        : null;
    const weightClass = Number.isFinite(weightClassManual) ? weightClassManual : weightClassAuto;

    const fileFamily = slugFileBase(familyRaw);
    const fileSubfamily = slugFileBase(subfamilyRaw);
    const base = fileFamily;
    setBusy(true);
    try {
      const instancerSettings = sanitizeVariableSettingsForInstancer(
        genSettings,
        selectedFont?.variableAxes,
      );
      const blob = await generateStaticFontFile(selectedFont, instancerSettings, format, {
        outputFontName: familyRaw,
        outputFontSubfamily: subfamilyRaw,
        outputWeightClass: weightClass,
        skipPseudoCssPrompt: true,
        allowPseudoStatic: isPro,
        onQuotaExceeded: () => {
          writeFreeStaticGenerationsUsed(sessionUserId || null, generationsLimit);
          setFreeGenerationsUsed(generationsLimit);
        },
      });
      if (blob) {
        const filename =
          fileSubfamily && fileSubfamily.toLowerCase() !== 'regular'
            ? `${base}-${fileSubfamily}.${format}`
            : `${base}.${format}`;
        downloadFile(blob, filename, mimeForFormat(format));
        if (!isPro && !devUnlimitedGenerations) {
          const nextUsed = freeGenerationsUsed + 1;
          writeFreeStaticGenerationsUsed(sessionUserId || null, nextUsed);
          setFreeGenerationsUsed(nextUsed);
        }
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  const vf = Boolean(selectedFont?.isVariableFont);
  const disabled = !vf || busy;
  const nameLockedByPlan = !isPro;
  const freeRemaining =
    isPro || devUnlimitedGenerations ? Infinity : Math.max(0, generationsLimit - freeGenerationsUsed);
  const freeLimitReached =
    !isPro && !devUnlimitedGenerations && freeGenerationsUsed >= generationsLimit;
  const inputInactive = disabled;
  const nameReadOnly = nameLockedByPlan;

  const inputClass = [
    'box-border h-10 w-full rounded-md border border-transparent bg-gray-50 py-0 pl-2 text-sm leading-normal uppercase font-semibold text-gray-900',
    'placeholder:text-gray-900/40 hover:placeholder:text-gray-900',
    NATIVE_SELECT_FIELD_INTERACTIVE,
    'focus:border-black/[0.14] focus:outline-none sm:pl-3',
  ]
    .filter(Boolean)
    .join(' ');

  const lockedInputClass = `${inputClass} cursor-default opacity-60`;
  const formatClass = customSelectTriggerClass();

  const handleProLockIconClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) return;
    toast.info('Доступно только в Pro');
    openPlans?.();
  };

  const proLockIcon = (iconInactive) => (
    <div className="absolute inset-y-0 right-1 z-10 flex items-center sm:right-2">
      <Tooltip content="Доступно только в Pro" openDelayMs={200}>
        <button
          type="button"
          disabled={iconInactive}
          onClick={handleProLockIconClick}
          className="group/pro-lock inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-200 text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-300 disabled:opacity-50"
          aria-label="Доступно только в Pro"
        >
          <EditAssetIcon
            src={updateIconUrl}
            className="h-5 w-5 transition-transform group-hover/pro-lock:scale-110"
          />
        </button>
      </Tooltip>
    </div>
  );

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center duration-300 ease-in-out ${
        isVisible ? 'bg-black/30' : 'bg-black/0'
      }`}
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        className={`relative flex max-h-[90vh] w-11/12 max-w-xl flex-col overflow-hidden rounded-none bg-white shadow-xl transition-all duration-300 ease-in-out ${
          isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0'
        }`}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <PopupDialogHeader title="Генерация шрифта" onClose={onClose} />

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {!vf ? (
            <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Доступно для <strong>вариативных</strong> шрифтов. Выберите VF в сессии.
            </div>
          ) : null}

          <div className="space-y-4">
            <div className="relative min-w-0 w-full">
              <input
                type="text"
                value={outputName}
                onChange={(e) => setOutputName(e.target.value)}
                readOnly={nameReadOnly}
                disabled={inputInactive}
                className={`${nameReadOnly ? lockedInputClass : inputClass} ${nameReadOnly ? 'pr-11 sm:pr-12' : 'pr-3'}`}
                placeholder="Имя файла"
                autoComplete="off"
                spellCheck={false}
                aria-label="Имя файла (без расширения)"
              />
              {nameReadOnly ? proLockIcon(inputInactive) : null}
            </div>

            <div className="relative min-w-0 w-full">
              <CustomSelect
                id="generate-font-subfamily"
                className={formatClass}
                value={subfamilyPreset}
                onChange={(v) => setSubfamilyPreset(v)}
                disabled={inputInactive || nameReadOnly}
                aria-label="Начертание (Subfamily)"
                options={subfamilyPresetOptions}
              />
            </div>

            {subfamilyPreset === SUBFAMILY_CUSTOM_VALUE ? (
              <div className="flex min-w-0 w-full gap-3">
                <div className="relative min-w-0 flex-1">
                <input
                  type="text"
                  value={customSubfamily}
                  onChange={(e) => setCustomSubfamily(e.target.value)}
                  readOnly={nameReadOnly}
                  disabled={inputInactive}
                  className={`${nameReadOnly ? lockedInputClass : inputClass} ${nameReadOnly ? 'pr-11 sm:pr-12' : 'pr-3'}`}
                  placeholder="Введите начертание (например, Bold Italic)"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Своё начертание (Subfamily)"
                />
                {nameReadOnly ? proLockIcon(inputInactive) : null}
              </div>
                <div className="min-w-[6.5rem]">
                  <CustomSelect
                    id="generate-font-custom-weight"
                    className={formatClass}
                    value={customWeightClass}
                    onChange={(v) => setCustomWeightClass(v)}
                    disabled={inputInactive || nameReadOnly}
                    aria-label="Жирность (OS/2 usWeightClass)"
                    options={WEIGHT_CUSTOM_OPTIONS}
                  />
                </div>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
              <div className="max-h-56 overflow-y-auto">
                {vf && axisRows.length > 0 ? (
                  axisRows.map((row, idx) => {
                    const tagUpper = row.tag.toUpperCase();
                    const isWght = row.tag.toLowerCase() === 'wght' && hasWght;
                    const isExpanded = isWght && expandedAxis === 'wght';
                    return (
                      <div key={row.tag} className={idx === 0 ? '' : 'border-t border-gray-100'}>
                        <button
                          type="button"
                          disabled={!isWght || disabled}
                          onClick={() => {
                            if (!isWght) return;
                            setExpandedAxis((prev) => (prev === 'wght' ? null : 'wght'));
                          }}
                          className={[
                            'flex w-full items-center justify-between px-4 py-4 text-left',
                            isWght ? 'cursor-pointer' : 'cursor-default',
                            !isWght ? 'pointer-events-none' : '',
                            disabled ? 'opacity-60' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          <span className="text-sm font-semibold uppercase tracking-tight text-gray-900">
                            {tagUpper}
                          </span>
                          <span className="text-sm font-semibold tabular-nums text-gray-900">
                            {formatAxisValue(row.value)}
                          </span>
                        </button>

                        {isExpanded ? (
                          <div className="variable-font-slider-container border-t border-gray-100 bg-gray-50 px-4 py-3">
                            <DraggableValueRangeSlider
                              min={wghtAxis.min}
                              max={wghtAxis.max}
                              step={1}
                              value={genSettings.wght ?? wghtAxis.default ?? 400}
                              defaultMarkerValue={wghtAxis.default}
                              onChange={(v) => setGenSettings((prev) => ({ ...prev, wght: v }))}
                              formatDisplay={(x) => String(Math.round(x))}
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <div className="px-4 py-6 text-sm font-semibold uppercase text-gray-400">Оси недоступны</div>
                )}
              </div>
            </div>

            <div>
              <CustomSelect
                id="generate-font-format"
                className={formatClass}
                value={format}
                onChange={setFormat}
                disabled={disabled}
                aria-label="Формат файла шрифта"
                options={[
                  { value: 'ttf', label: 'TTF' },
                  { value: 'otf', label: 'OTF' },
                  { value: 'woff', label: 'WOFF' },
                  { value: 'woff2', label: 'WOFF2' },
                ]}
              />
            </div>

            {!isPro && !devUnlimitedGenerations ? (
              <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
                {freeRemaining > 0 ? (
                  <p className="text-sm leading-relaxed text-gray-800">
                    {getStaticGenerationsAvailabilityMessage(isAuthenticated, freeRemaining, generationsLimit)}
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm leading-relaxed text-gray-800">
                      {getStaticGenerationsAvailabilityMessage(isAuthenticated, 0)}
                    </p>
                    <AppButton
                      type="button"
                      variant="accent"
                      size="sm"
                      className="!min-h-8 shrink-0"
                      onClick={() => (isAuthenticated ? openPlans?.() : requestSignIn?.())}
                    >
                      {isAuthenticated ? 'Pro' : 'Войти'}
                    </AppButton>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-stretch gap-3 border-t border-gray-200 bg-white px-6 py-5">
          <AppButton type="button" variant="outline" fullWidth className="!min-h-8" onClick={onClose} disabled={busy}>
            Отменить
          </AppButton>
          <AppButton
            type="button"
            variant="accent"
            fullWidth
            className="!min-h-8"
            onClick={() => void handleGenerate()}
            disabled={busy || !vf || freeLimitReached}
          >
            {busy ? 'Генерация…' : 'Сгенерировать'}
          </AppButton>
        </div>
      </div>
    </div>
  );
}

