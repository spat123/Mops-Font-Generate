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
  readFreeStaticGenerationsUsed,
  writeFreeStaticGenerationsUsed,
} from '../utils/freeStaticGenerationQuota';

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
  const [outputSubfamily, setOutputSubfamily] = useState('Regular');
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

  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (justOpened && selectedFont) {
      setOutputName(defaultOutputName);
      setOutputSubfamily('Regular');
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

  const handleBackdropMouseDown = (e) => {
    /** Только реальный клик по затемнению: не закрываем при отпускании кнопки мыши после выделения текста в инпуте (mouseup на оверлее). */
    if (e.target !== e.currentTarget) return;
    if (e.button !== 0) return;
    onClose();
  };

  const handleGenerate = async () => {
    if (!isAuthenticated) {
      requestSignIn?.();
      return;
    }
    if (!selectedFont?.isVariableFont) {
      toast.error('Выберите вариативный шрифт');
      return;
    }
    if (!isPro && freeGenerationsUsed >= FREE_STATIC_GENERATIONS_LIMIT) {
      toast.info('Лимит Free на генерации исчерпан. Посмотрите планы, чтобы продолжить.');
      openPlans?.();
      return;
    }
    const familyRaw = String(outputName || '').trim() || 'font';
    const subfamilyRaw = String(outputSubfamily || '').trim() || 'Regular';
    const fileFamily = slugFileBase(familyRaw);
    const fileSubfamily = slugFileBase(subfamilyRaw);
    const base = fileFamily;
    setBusy(true);
    try {
      const blob = await generateStaticFontFile(selectedFont, genSettings, format, {
        outputFontName: familyRaw,
        outputFontSubfamily: subfamilyRaw,
        skipPseudoCssPrompt: true,
      });
      if (blob) {
        const filename =
          fileSubfamily && fileSubfamily.toLowerCase() !== 'regular'
            ? `${base}-${fileSubfamily}-static.${format}`
            : `${base}-static.${format}`;
        downloadFile(blob, filename, mimeForFormat(format));
        if (!isPro && sessionUserId) {
          const nextUsed = freeGenerationsUsed + 1;
          writeFreeStaticGenerationsUsed(sessionUserId, nextUsed);
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
  const freeRemaining = Math.max(0, FREE_STATIC_GENERATIONS_LIMIT - freeGenerationsUsed);
  const freeLimitReached = isAuthenticated && !isPro && freeGenerationsUsed >= FREE_STATIC_GENERATIONS_LIMIT;

  const inputClass = [
    'box-border h-10 w-full rounded-md border border-transparent bg-gray-50 py-0 pl-2 text-sm leading-normal uppercase font-semibold text-gray-900',
    'placeholder:text-gray-900/40 hover:placeholder:text-gray-900',
    NATIVE_SELECT_FIELD_INTERACTIVE,
    'focus:border-black/[0.14] focus:outline-none sm:pl-3',
  ]
    .filter(Boolean)
    .join(' ');

  const formatClass = customSelectTriggerClass();

  const showLoginGate = !authLoading && !isAuthenticated;

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

          <div className="space-y-5">
            <div className="relative min-w-0 w-full">
              <input
                type="text"
                value={outputName}
                onChange={(e) => {
                  if (nameLockedByPlan) return;
                  setOutputName(e.target.value);
                }}
                onMouseDown={(e) => {
                  if (!nameLockedByPlan) return;
                  e.preventDefault();
                  if (!isAuthenticated) {
                    toast.info('Войдите, чтобы продолжить');
                    requestSignIn?.();
                    return;
                  }
                  toast.info('Изменение имени файла доступно в Pro');
                  openPlans?.();
                }}
                readOnly={nameLockedByPlan}
                disabled={disabled}
                className={`${inputClass} ${nameLockedByPlan ? 'cursor-pointer pr-11 sm:pr-12' : 'pr-3'}`}
                placeholder="Имя файла"
                autoComplete="off"
                spellCheck={false}
                aria-label="Имя файла (без расширения)"
              />
              {nameLockedByPlan ? (
                <div className="absolute inset-y-0 right-1 z-10 flex items-center sm:right-2">
                  <Tooltip content="Доступно только в Pro" openDelayMs={200}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!isAuthenticated) {
                          toast.info('Войдите, чтобы продолжить');
                          requestSignIn?.();
                          return;
                        }
                        toast.info('Доступно только в Pro');
                        openPlans?.();
                      }}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-200 text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Доступно только в Pro"
                    >
                      <EditAssetIcon src={updateIconUrl} className="h-5 w-5" />
                    </button>
                  </Tooltip>
                </div>
              ) : null}
            </div>

            <div className="relative min-w-0 w-full">
              <input
                type="text"
                value={outputSubfamily}
                onChange={(e) => {
                  if (nameLockedByPlan) return;
                  setOutputSubfamily(e.target.value);
                }}
                onMouseDown={(e) => {
                  if (!nameLockedByPlan) return;
                  e.preventDefault();
                  if (!isAuthenticated) {
                    toast.info('Войдите, чтобы продолжить');
                    requestSignIn?.();
                    return;
                  }
                  toast.info('Доступно только в Pro');
                  openPlans?.();
                }}
                readOnly={nameLockedByPlan}
                disabled={disabled}
                className={`${inputClass} ${nameLockedByPlan ? 'cursor-pointer pr-11 sm:pr-12' : 'pr-3'}`}
                placeholder="Начертание (например, Regular)"
                autoComplete="off"
                spellCheck={false}
                aria-label="Начертание (Subfamily)"
              />
              {nameLockedByPlan ? (
                <div className="absolute inset-y-0 right-1 z-10 flex items-center sm:right-2">
                  <Tooltip content="Доступно только в Pro" openDelayMs={200}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!isAuthenticated) {
                          toast.info('Войдите, чтобы продолжить');
                          requestSignIn?.();
                          return;
                        }
                        toast.info('Доступно только в Pro');
                        openPlans?.();
                      }}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-200 text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Доступно только в Pro"
                    >
                      <EditAssetIcon src={updateIconUrl} className="h-5 w-5" />
                    </button>
                  </Tooltip>
                </div>
              ) : null}
            </div>

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

            {isAuthenticated && !isPro ? (
              <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
                {freeRemaining > 0 ? (
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                    Free: осталось генераций{' '}
                    <span className="tabular-nums text-gray-900">{freeRemaining}</span>/
                    <span className="tabular-nums">{FREE_STATIC_GENERATIONS_LIMIT}</span>
                  </p>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                      Free: лимит генераций исчерпан
                    </p>
                    <AppButton
                      type="button"
                      variant="accent"
                      size="sm"
                      className="!min-h-8 shrink-0"
                      onClick={() => openPlans?.()}
                    >
                      Pro
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
            disabled={busy || !vf || showLoginGate}
          >
            {busy ? 'Генерация…' : freeLimitReached ? 'Pro' : 'Сгенерировать'}
          </AppButton>
        </div>

        {showLoginGate ? (
          <div
            className="absolute bottom-0 left-0 right-0 top-12 z-[100] flex items-center justify-center backdrop-blur-sm bg-black/35 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Вход для генерации"
          >
            <div
              className="w-full max-w-sm border border-gray-200 bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-center text-sm leading-relaxed text-gray-800">
                Чтобы начать генерацию, войдите в аккаунт.
              </p>
              <AppButton
                type="button"
                variant="accent"
                fullWidth
                className="mt-4 !min-h-10"
                onClick={() => requestSignIn?.()}
              >
                Войти
              </AppButton>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

