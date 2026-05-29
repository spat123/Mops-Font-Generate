import { useCallback, useMemo, useState } from 'react';
import type { SessionFontRecord } from '../types/editorFonts';
import { useOpenTypeFeatures } from '../hooks/useOpenTypeFeatures';
import { useSettings } from '../contexts/SettingsContext';
import { OpenTypeFeatureIcon, hasOpenTypeFeatureIcon } from './opentype/OpenTypeFeatureIcons';
import { IconCircleButton } from './ui/IconCircleButton';
import { Tooltip } from './ui/Tooltip';
import {
  DEFAULT_ENABLED_OPEN_TYPE_FEATURES,
  resolveOpenTypeFeatureEnabled,
  toggleOpenTypeFeatureOverride,
} from '../utils/openTypeFeatureSettings';

const FEATURE_LABELS: Record<string, string> = {
  // Позиционирование (GPOS)
  mark: 'Позиционирование диакритик над/под буквой',
  mkmk: 'Позиция диакритики относительно другой',
  abvm: 'Знаки над базовой линией',
  blwm: 'Знаки под базовой линией',
  dist: 'Расстояние между буквой и диакритикой',
  curs: 'Соединение букв в курсиве/рукописи',
  kern: 'Кернинг',
  // Лигатуры и замены
  ccmp: 'Базовая буква + диакритика',
  locl: 'Локализованные формы букв',
  liga: 'Стандартные лигатуры',
  clig: 'Контекстные лигатуры',
  dlig: 'Декоративные лигатуры',
  hlig: 'Исторические лигатуры',
  rlig: 'Обязательные лигатуры',
  calt: 'Контекстные альтернативы',
  salt: 'Стилистические альтернативы',
  swsh: 'Росчерк / декоративные формы',
  titl: 'Титульные формы',
  aalt: 'Показать все альтернативы',
  hist: 'Исторические формы',
  nalt: 'Альтернативные начертания',
  dalt: 'Декоративные альтернативы',
  rand: 'Случайный выбор альтернатив',
  // Цифры и дроби
  frac: 'Дроби из 1/2',
  afrc: 'Вертикальные дроби (альт.)',
  numr: 'Числитель дробей',
  dnom: 'Знаменатель дробей',
  subs: 'Нижние индексы',
  sups: 'Верхние индексы',
  sinf: 'Научные нижние индексы',
  ordn: 'Порядковые (1st, 2nd)',
  zero: 'Ноль со слэшем',
  onum: 'Старый стиль цифр',
  lnum: 'Линейные цифры',
  tnum: 'Табличные цифры',
  pnum: 'Пропорциональные цифры',
  // Капители и регистр
  smcp: 'Малые капители',
  c2sc: 'КАПС → малые капители',
  pcap: 'Малые прописные (petite)',
  c2pc: 'КАПС → petite capitals',
  unic: 'Единый регистр (unicase)',
  case: 'Case‑sensitive пунктуация',
  cpsp: 'Интервал для прописных',
  cpct: 'Сжатие прописных',
  // Ширина и вертикаль
  fwid: 'Полная ширина знака',
  hwid: 'Половинная ширина',
  pwid: 'Пропорциональная ширина',
  twid: 'Треть ширины',
  qwid: 'Четверть ширины',
  halt: 'Узкие знаки (альт.)',
  vert: 'Вертикальные формы',
  vrt2: 'Вертикальное набрание',
  valt: 'Вертикальные альтернативы',
  // Арабская / индийская раскладка
  init: 'Начальная форма (араб.)',
  medi: 'Срединная форма (араб.)',
  fina: 'Конечная форма (араб.)',
  isol: 'Изолированная форма (араб.)',
  rphf: 'Reph, слитная согласная (деванагари)',
  pref: 'Пре-базовые формы',
  blwf: 'Подстрочные формы',
  pstf: 'Пост-базовые формы',
  haln: 'Половинные формы',
  nukt: 'Точка nukta',
  akhn: 'Слитная akhand‑форма',
  // Прочее
  ruby: 'Фуригана (ruby)',
  ornm: 'Орнаменты',
};

const FEATURE_SAMPLES: Record<string, string> = {
  ccmp: `a\u0301`,
  locl: 'șț',
  liga: 'ff',
  clig: 'fi',
  dlig: 'st',
  calt: 'g/g',
  kern: 'AV',
  case: 'h-H-',
  subs: 'H₂O',
  sups: 'H²',
  ordn: '1st',
  tnum: '0123',
  onum: '013',
  smcp: 'Aa',
  c2sc: 'AA',
  aalt: 'aalt',
  salt: 'f',
  mark: 'á',
  mkmk: 'ä',
  rlig: 'لا',
  abvm: 'á',
  blwm: 'ç',
  zero: '0',
  hlig: 'st',
};

function featureLabel(tag: string): string {
  const k = String(tag || '').trim().toLowerCase().slice(0, 4);
  if (!k) return '';
  if (k.startsWith('ss') && /^\d{2}$/.test(k.slice(2))) return `Стилистический набор ${k.toUpperCase()}`;
  if (k.startsWith('cv') && /^\d{2}$/.test(k.slice(2))) return `Вариант символа ${k.toUpperCase()}`;
  return FEATURE_LABELS[k] || `OpenType‑фича ${k.toUpperCase()}`;
}

function featureSample(tag: string): string {
  const k = String(tag || '').trim().toLowerCase().slice(0, 4);
  if (!k) return '';
  if (FEATURE_SAMPLES[k]) return FEATURE_SAMPLES[k];
  // Для неизвестных фич не показываем сам тег как “образец” — иначе UI-кнопка
  // начинает зависеть от выбранного шрифта/сабсета (часто нет базовой латиницы),
  // и DevTools показывает “Roboto … (4 glyphs)” для CCMP и т.п.
  return 'Aa';
}

function buildOpenTypeTooltip({
  tag,
}: {
  tag: string;
}) {
  const k = String(tag || '').trim().toLowerCase().slice(0, 4);
  // Тултип должен быть коротким и понятным, без “ccmp · ccmp · по умолчанию”.
  return `${featureLabel(k)} (${k.toUpperCase()})`;
}

type Props = {
  font: SessionFontRecord | null | undefined;
  disabled?: boolean;
};

export function OpenTypeFeaturesPanel({ font, disabled = false }: Props) {
  const { openTypeFeatureOverrides, setOpenTypeFeatureOverrides } = useSettings();
  const { loading, report } = useOpenTypeFeatures(font);
  const [expanded, setExpanded] = useState(false);

  const tags = report?.tags || [];

  const hasOverrides = useMemo(
    () => Object.keys(openTypeFeatureOverrides || {}).length > 0,
    [openTypeFeatureOverrides],
  );

  const handleResetOverrides = useCallback(() => {
    setOpenTypeFeatureOverrides({});
  }, [setOpenTypeFeatureOverrides]);
  const hasAnyDefaultEnabled = useMemo(
    () => tags.some((t) => DEFAULT_ENABLED_OPEN_TYPE_FEATURES.has(String(t).slice(0, 4).toLowerCase())),
    [tags],
  );

  const visibleTags = expanded ? tags : tags.slice(0, 25);
  const hiddenCount = Math.max(0, tags.length - visibleTags.length);

  if (!font) return null;

  return (
    <div
      className={`-mx-4 border-t border-gray-200 px-4 pt-4 mb-4 ${
        disabled ? 'pointer-events-none opacity-40' : ''
      }`.trim()}
      aria-disabled={disabled || undefined}
    >
      <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
        <h2 className="min-w-0 shrink text-sm font-semibold uppercase tracking-wide text-gray-900">OpenType</h2>
        <Tooltip content="Сбросить OpenType к значениям по умолчанию">
          <IconCircleButton
            variant="toolbar"
            size="sm"
            disabled={disabled || !hasOverrides}
            onClick={handleResetOverrides}
            aria-label="Сбросить OpenType к значениям по умолчанию"
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
          </IconCircleButton>
        </Tooltip>
      </div>
      <div className="text-[10px] leading-4 text-gray-500">
        {loading
          ? 'Анализ шрифта…'
          : tags.length === 0
            ? 'Фичи не найдены или недоступны'
            : hasAnyDefaultEnabled
              ? 'Некоторые включены по умолчанию'
              : 'Доступны для включения'}
      </div>

      {tags.length > 0 ? (
        <>
          <div className="mt-3 grid grid-cols-5 justify-items-center gap-2">
            {visibleTags.map((tag) => {
              const k = String(tag || '').trim().toLowerCase().slice(0, 4);
              if (!k) return null;
              const overridden = Object.prototype.hasOwnProperty.call(openTypeFeatureOverrides, k);
              const enabled = resolveOpenTypeFeatureEnabled(k, openTypeFeatureOverrides);
              const byDefault = DEFAULT_ENABLED_OPEN_TYPE_FEATURES.has(k);
              const tooltipAria = `${featureLabel(k)} (${k.toUpperCase()})`;

              return (
                <Tooltip
                  key={k}
                  content={buildOpenTypeTooltip({ tag: k })}
                  openDelayMs={250}
                >
                  <button
                    type="button"
                    disabled={disabled}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border text-center transition-colors font-sans ${
                      enabled
                        ? 'border-accent bg-accent text-white'
                        : 'border-gray-50 bg-gray-50 text-gray-900 hover:text-accent'
                    } ${overridden ? 'ring-2 ring-inset ring-accent' : byDefault ? 'ring-1 ring-inset ring-black/5' : ''}`.trim()}
                    aria-pressed={enabled}
                    aria-label={tooltipAria}
                    onClick={() =>
                      setOpenTypeFeatureOverrides((prev) =>
                        toggleOpenTypeFeatureOverride(k, (prev || {}) as Record<string, 0 | 1>),
                      )
                    }
                  >
                    {hasOpenTypeFeatureIcon(k) ? (
                      <OpenTypeFeatureIcon tag={k} />
                    ) : (
                      <span
                        className="text-sm font-semibold leading-none"
                        style={{
                          fontFeatureSettings: `"${k}" 1`,
                        }}
                      >
                        {featureSample(k)}
                      </span>
                    )}
                  </button>
                </Tooltip>
              );
            })}
          </div>

          {hiddenCount > 0 ? (
            <div className="mt-3">
              <button
                type="button"
                className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-900"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? 'Свернуть' : `Показать ещё (${hiddenCount})`}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

