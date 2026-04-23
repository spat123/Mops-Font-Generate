import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { toast } from '../utils/appNotify';
import VariableFontControls from './VariableFontControls';
import FontLibrarySidebar from './FontLibrarySidebar';
import { hsvToRgb, rgbToHex, hexToHsv, hexToRgbComponents } from '../utils/colorUtils'; // Импорт утилит цвета
import { useSettings } from '../contexts/SettingsContext';
import { ENTIRE_PRINTABLE_ASCII_SAMPLE } from '../utils/previewSampleStrings';
import { useFontContext } from '../contexts/FontContext';
import ResetButton from './ResetButton';
import {
  SegmentedControl,
  VIEW_MODE_OPTIONS,
  ICON_RAIL_TRACK_CLASS,
  iconRailSegmentClass,
} from './ui/SegmentedControl';
import DraggableValueRangeSlider from './ui/DraggableValueRangeSlider';
import { CustomSelect } from './ui/CustomSelect';
import { EDITOR_SIDEBAR_FOOTER_BAR_CLASS } from './ui/editorChromeClasses';
import { customSelectTriggerClass } from './ui/nativeSelectFieldClasses';
import { Tooltip } from './ui/Tooltip';
import { IconCircleButton } from './ui/IconCircleButton';

const sidebarSelectClass = customSelectTriggerClass({ compact: true });

/** Быстрые образцы текста (ключи совпадают с `sampleTexts` в pages/index). */
const SAMPLE_QUICK_PRESETS = [
  { key: 'title', label: 'Заголовок' },
  { key: 'paragraph', label: 'Параграф' },
  { key: 'wikipedia', label: 'Вики' },
  { key: 'pangram', label: 'Панграмма' },
];

/** Наборы символов (ключи — `glyphSets`). */
const GLYPH_QUICK_PRESETS = [
  { key: 'macos', label: 'Mac OS' },
  { key: 'windows1252', label: 'Windows' },
  { key: 'latin_extended', label: 'Latin Ext. A' },
  { key: 'latin_supplement', label: 'Latin-1 доп.' },
];

const WATERFALL_SCALE_PRESETS = [
  { key: 'minor-second', ratio: 1.067, label: '1.067 - Minor Second' },
  { key: 'major-second', ratio: 1.125, label: '1.125 - Major Second' },
  { key: 'minor-third', ratio: 1.2, label: '1.200 - Minor Third' },
  { key: 'major-third', ratio: 1.25, label: '1.250 - Major Third' },
  { key: 'perfect-fourth', ratio: 1.333, label: '1.333 - Perfect Fourth' },
  { key: 'augmented-fourth', ratio: 1.414, label: '1.414 - Augmented Fourth' },
  { key: 'perfect-fifth', ratio: 1.5, label: '1.500 - Perfect Fifth' },
  { key: 'golden-ratio', ratio: 1.618, label: '1.618 - Golden Ratio' },
];

/** Вертикальное положение текста в превью: строки у верха / середины / низа области */
function IconVerticalTextTop(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      {...props}
    >
      <path
        d="M11.2607 6.73828C11.6682 6.33078 12.3288 6.33078 12.7363 6.73828L16.9492 10.9502C17.3395 11.3407 17.3397 11.9738 16.9492 12.3643C16.5588 12.7546 15.9257 12.7545 15.5352 12.3643L13 9.8291V23C13 23.5523 12.5523 24 12 24C11.4477 24 11 23.5523 11 23V9.82715L8.46289 12.3643C8.07238 12.7545 7.43927 12.7546 7.04883 12.3643C6.65839 11.9738 6.65857 11.3407 7.04883 10.9502L11.2607 6.73828Z"
        fill="currentColor"
      />
      <path
        d="M23 0C23.5523 2.57702e-07 24 0.447715 24 1C24 1.55228 23.5523 2 23 2H1C0.447715 2 0 1.55228 0 1C0 0.447715 0.447715 1.61064e-08 1 0H23Z"
        fill="currentColor"
      />
    </svg>
  );
}
function IconVerticalTextMiddle(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      {...props}
    >
      <path
        d="M11.2607 14.7344C11.6682 14.3269 12.3288 14.3269 12.7363 14.7344L16.9492 18.9463C17.3396 19.3368 17.3397 19.9699 16.9492 20.3604C16.5588 20.7508 15.9257 20.7507 15.5352 20.3604L13.002 17.8271V23C13.002 23.5523 12.5542 24 12.002 24C11.4497 24 11.002 23.5523 11.002 23V17.8213L8.46289 20.3604C8.07235 20.7507 7.4393 20.7508 7.04883 20.3604C6.65835 19.9699 6.65846 19.3368 7.04883 18.9463L11.2607 14.7344Z"
        fill="currentColor"
      />
      <path
        d="M24 11.9971C24 12.5494 23.5523 12.9971 23 12.9971H1C0.447716 12.9971 0 12.5494 0 11.9971C0 11.4448 0.447715 10.9971 1 10.9971H23C23.5523 10.9971 24 11.4448 24 11.9971Z"
        fill="currentColor"
      />
      <path
        d="M12.998 6.17285L15.5352 3.63672C15.9257 3.2462 16.5587 3.24622 16.9492 3.63672C17.3397 4.02724 17.3397 4.66026 16.9492 5.05078L12.7373 9.2627C12.3298 9.66996 11.6691 9.67012 11.2617 9.2627L7.0498 5.05078C6.65924 4.66028 6.65927 4.02725 7.0498 3.63672C7.44032 3.24629 8.07339 3.24624 8.46387 3.63672L10.998 6.1709V1C10.998 0.447715 11.4458 0 11.998 0C12.5503 0 12.998 0.447715 12.998 1V6.17285Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconRoundingUp(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      {...props}
    >
      <path
        d="M20.1707 5.45639C20.5627 5.06745 21.1958 5.06938 21.5848 5.46127C21.9738 5.85331 21.971 6.48731 21.5789 6.87631L18.9159 9.51889C17.0193 11.4008 13.9779 11.4586 12.0106 9.65072L10.4295 8.1976C9.29026 7.15074 7.54112 7.14264 6.39144 8.17807L3.54379 10.7425C3.1334 11.1119 2.50122 11.0786 2.13168 10.6683C1.76227 10.2579 1.79558 9.62573 2.20589 9.25619L5.05355 6.69174C6.96973 4.96602 9.88428 4.98007 11.783 6.72494L13.3641 8.17807C14.5445 9.26276 16.3687 9.22804 17.5067 8.09897L20.1707 5.45639Z"
        fill="currentColor"
      />
      <path
        d="M20.1707 12.4564C20.5627 12.0675 21.1958 12.0694 21.5848 12.4613C21.9738 12.8533 21.971 13.4873 21.5789 13.8763L18.9159 16.5189C17.0193 18.4008 13.9779 18.4586 12.0106 16.6507L10.4295 15.1976C9.29026 14.1507 7.54112 14.1426 6.39144 15.1781L3.54379 17.7425C3.1334 18.1119 2.50122 18.0786 2.13168 17.6683C1.76227 17.2579 1.79558 16.6257 2.20589 16.2562L5.05355 13.6917C6.96973 11.966 9.88428 11.9801 11.783 13.7249L13.3641 15.1781C14.5445 16.2628 16.3687 16.228 17.5067 15.099L20.1707 12.4564Z"
        fill="currentColor"
      />
    </svg>
  );
}
function IconVerticalTextBottom(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      {...props}
    >
      <path
        d="M23 22C23.5523 22 24 22.4477 24 23C24 23.5523 23.5523 24 23 24H1C0.447716 24 1.08565e-06 23.5523 0 23C4.82823e-08 22.4477 0.447715 22 1 22H23Z"
        fill="currentColor"
      />
      <path
        d="M12 0C12.5523 2.41411e-08 13 0.447715 13 1V14.1729L15.5371 11.6367C15.9276 11.2463 16.5607 11.2462 16.9512 11.6367C17.3416 12.0272 17.3416 12.6603 16.9512 13.0508L12.708 17.2939C12.5127 17.489 12.2568 17.586 12.001 17.5859C11.9369 17.586 11.8727 17.5806 11.8096 17.5684C11.778 17.5622 11.7468 17.5541 11.7158 17.5449C11.5614 17.4992 11.4159 17.4157 11.2939 17.2939L7.05078 13.0508C6.66036 12.6603 6.66036 12.0272 7.05078 11.6367C7.44128 11.2462 8.07431 11.2463 8.46484 11.6367L11 14.1709V1C11 0.447715 11.4477 -2.41411e-08 12 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconTextAlignLeft(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      {...props}
    >
      <path
        d="M13 20C13.5523 20 14 20.4477 14 21C14 21.5523 13.5523 22 13 22H1C0.447715 22 0 21.5523 0 21C0 20.4477 0.447715 20 1 20H13Z"
        fill="currentColor"
      />
      <path
        d="M19 14C19.5523 14 20 14.4477 20 15C20 15.5523 19.5523 16 19 16H1C0.447715 16 0 15.5523 0 15C0 14.4477 0.447715 14 1 14H19Z"
        fill="currentColor"
      />
      <path
        d="M13 8C13.5523 8 14 8.44772 14 9C14 9.55228 13.5523 10 13 10H1C0.447715 10 0 9.55228 0 9C0 8.44772 0.447715 8 1 8H13Z"
        fill="currentColor"
      />
      <path
        d="M23 2C23.5523 2 24 2.44772 24 3C24 3.55228 23.5523 4 23 4H1C0.447715 4 0 3.55228 0 3C0 2.44772 0.447715 2 1 2H23Z"
        fill="currentColor"
      />
    </svg>
  );
}
function IconTextAlignCenter(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      {...props}
    >
      <path
        d="M18 20C18.5523 20 19 20.4477 19 21C19 21.5523 18.5523 22 18 22H6C5.44772 22 5 21.5523 5 21C5 20.4477 5.44772 20 6 20H18Z"
        fill="currentColor"
      />
      <path
        d="M21 14C21.5523 14 22 14.4477 22 15C22 15.5523 21.5523 16 21 16H3C2.44772 16 2 15.5523 2 15C2 14.4477 2.44772 14 3 14H21Z"
        fill="currentColor"
      />
      <path
        d="M18 8C18.5523 8 19 8.44772 19 9C19 9.55228 18.5523 10 18 10H6C5.44772 10 5 9.55228 5 9C5 8.44772 5.44772 8 6 8H18Z"
        fill="currentColor"
      />
      <path
        d="M23 2C23.5523 2 24 2.44772 24 3C24 3.55228 23.5523 4 23 4H1C0.447715 4 0 3.55228 0 3C0 2.44772 0.447715 2 1 2H23Z"
        fill="currentColor"
      />
    </svg>
  );
}
function IconTextAlignRight(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      {...props}
    >
      <path
        d="M23 20C23.5523 20 24 20.4477 24 21C24 21.5523 23.5523 22 23 22H11C10.4477 22 10 21.5523 10 21C10 20.4477 10.4477 20 11 20H23Z"
        fill="currentColor"
      />
      <path
        d="M23 14C23.5523 14 24 14.4477 24 15C24 15.5523 23.5523 16 23 16H5C4.44772 16 4 15.5523 4 15C4 14.4477 4.44772 14 5 14H23Z"
        fill="currentColor"
      />
      <path
        d="M23 8C23.5523 8 24 8.44772 24 9C24 9.55228 23.5523 10 23 10H11C10.4477 10 10 9.55228 10 9C10 8.44772 10.4477 8 11 8H23Z"
        fill="currentColor"
      />
      <path
        d="M23 2C23.5523 2 24 2.44772 24 3C24 3.55228 23.5523 4 23 4H1C0.447715 4 0 3.55228 0 3C0 2.44772 0.447715 2 1 2H23Z"
        fill="currentColor"
      />
    </svg>
  );
}
function IconTextAlignJustify(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      {...props}
    >
      <path
        d="M0 3C0 2.44772 0.447715 2 1 2H23C23.5523 2 24 2.44772 24 3C24 3.55228 23.5523 4 23 4H1C0.447716 4 0 3.55228 0 3Z"
        fill="currentColor"
      />
      <path
        d="M0 9C0 8.44772 0.447715 8 1 8H23C23.5523 8 24 8.44772 24 9C24 9.55228 23.5523 10 23 10H1C0.447716 10 0 9.55228 0 9Z"
        fill="currentColor"
      />
      <path
        d="M0 15C0 14.4477 0.447715 14 1 14H23C23.5523 14 24 14.4477 24 15C24 15.5523 23.5523 16 23 16H1C0.447716 16 0 15.5523 0 15Z"
        fill="currentColor"
      />
      <path
        d="M0 21C0 20.4477 0.447715 20 1 20H23C23.5523 20 24 20.4477 24 21C24 21.5523 23.5523 22 23 22H1C0.447716 22 0 21.5523 0 21Z"
        fill="currentColor"
      />
    </svg>
  );
}
function IconTextFillExpand(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      {...props}
    >
      <path
        d="M7.99996 6.33008e-10C8.55226 -1.9475e-05 9 0.447703 9 1C9 1.55227 8.55231 1.99998 8.00004 2L2 2.00024V7.99996C2 8.55225 1.55228 8.99996 1 8.99996C0.447715 8.99996 0 8.55225 0 7.99996V1.25024C0 0.559881 0.559645 0.000238024 1.25 0.000238024L7.99996 6.33008e-10Z"
        fill="currentColor"
      />
      <path
        d="M16 6.33008e-10C15.4477 -1.9475e-05 15 0.447703 15 1C15 1.55227 15.4477 1.99998 16 2L22 2.00024V7.99996C22 8.55225 22.4477 8.99996 23 8.99996C23.5523 8.99996 24 8.55225 24 7.99996V1.25024C24 0.559881 23.4404 0.000238024 22.75 0.000238024L16 6.33008e-10Z"
        fill="currentColor"
      />
      <path
        d="M7.99996 23.9999C8.55226 23.9999 9 23.5522 9 22.9999C9 22.4477 8.55231 21.9999 8.00004 21.9999L2 21.9997V16C2 15.4477 1.55228 15 1 15C0.447715 15 0 15.4477 0 16V22.7497C0 23.44 0.559645 23.9997 1.25 23.9997L7.99996 23.9999Z"
        fill="currentColor"
      />
      <path
        d="M16 23.9999C15.4477 23.9999 15 23.5522 15 22.9999C15 22.4477 15.4477 21.9999 16 21.9999L22 21.9997V16C22 15.4477 22.4477 15 23 15C23.5523 15 24 15.4477 24 16V22.7497C24 23.44 23.4404 23.9997 22.75 23.9997L16 23.9999Z"
        fill="currentColor"
      />
      <path
        d="M6.00001 5.99997C6.00001 5.44768 6.44772 4.99997 7.00001 4.99997H17C17.5523 4.99997 18 5.44768 18 5.99997C18 6.55225 17.5523 6.99997 17 6.99997H7.00001C6.44772 6.99997 6.00001 6.55225 6.00001 5.99997Z"
        fill="currentColor"
      />
      <path
        d="M12 19C11.4477 19 11 18.5523 11 18L11 6.99997H13V18C13 18.5523 12.5523 19 12 19Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Опции для {@link SegmentedControl} variant="iconRail": выравнивание и регистр */
const SIDEBAR_TEXT_ALIGN_OPTIONS = [
  { value: 'left', title: 'По левому краю', Icon: IconTextAlignLeft },
  { value: 'center', title: 'По центру строки', Icon: IconTextAlignCenter },
  { value: 'right', title: 'По правому краю', Icon: IconTextAlignRight },
  {
    value: 'justify',
    title: 'Растянуть по ширине',
    'aria-label': 'Растянуть текст по ширине',
    Icon: IconTextAlignJustify,
  },
];
const SIDEBAR_TEXT_CASE_OPTIONS = [
  {
    value: 'none',
    title: 'Обычный регистр',
    label: 'Аа',
    labelClassName: 'text-[14px] font-normal leading-none',
  },
  {
    value: 'uppercase',
    title: 'Верхний регистр',
    label: 'АА',
    labelClassName: 'text-[14px] font-normal leading-none',
  },
];
const SIDEBAR_TEXT_DECORATION_OPTIONS = [
  { value: 'underline', label: 'U', labelClassName: 'text-[14px] font-normal underline leading-none' },
  { value: 'line-through', label: 'S', labelClassName: 'text-[14px] font-normal line-through leading-none' },
];
const SIDEBAR_VERTICAL_ALIGN_OPTIONS = [
  { value: 'top', title: 'По верхнему краю', 'aria-label': 'Вертикально: по верху', Icon: IconVerticalTextTop },
  { value: 'middle', title: 'По центру вертикали', 'aria-label': 'Вертикально: по центру', Icon: IconVerticalTextMiddle },
  { value: 'bottom', title: 'По нижнему краю', 'aria-label': 'Вертикально: по низу', Icon: IconVerticalTextBottom },
];

const SIDEBAR_PRESET_BTN_BASE =
  'rounded-md border px-3 py-1.5 text-center text-xs uppercase font-semibold transition-colors duration-150 disabled:opacity-40';
const SIDEBAR_PRESET_BTN_IDLE =
  `${SIDEBAR_PRESET_BTN_BASE} h-8 border-gray-200 bg-white text-gray-800 hover:bg-black/[0.9] hover:text-white disabled:hover:bg-white disabled:hover:text-gray-800`;
/** Активные чипы/сегменты: акцентный фон */
const SIDEBAR_PRESET_BTN_ACTIVE =
  `${SIDEBAR_PRESET_BTN_BASE} border-accent bg-accent text-white hover:bg-accent-hover disabled:hover:bg-accent disabled:hover:text-white`;

/** Строка: переключатель HEX/RGB + поле(я) в единой сетке */
const COLOR_VALUE_ROW = 'flex min-w-0 w-full max-w-full items-center gap-2';
const COLOR_FIELD_INPUT =
  'min-w-0 flex-1 h-8 rounded-md border border-gray-50 bg-gray-50 px-2 py-1.5 text-xs tabular-nums text-gray-800 placeholder:text-gray-400 focus:border-black/[0.14] focus:outline-none disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:placeholder:text-gray-400';

/** Три поля R G B (0-255) */
function RgbTripletInputs({ hex, onChannelChange, disabled = false }) {
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
        disabled={disabled}
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
        disabled={disabled}
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
        disabled={disabled}
        className={COLOR_FIELD_INPUT}
      />
    </div>
  );
}

/** Иконки для слайдеров (подписи — в `title` у контейнера) */
function SliderIconFontSize(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      {...props}
    >
      <path
        d="M8 21C8 21.5523 7.55228 22 7 22C6.44772 22 6 21.5523 6 21V4H1C0.447715 4 0 3.55228 0 3C0 2.44772 0.447715 2 1 2H13C13.5523 2 14 2.44772 14 3C14 3.55228 13.5523 4 13 4H8V21Z"
        fill="currentColor"
      />
      <path
        d="M23 8C23.5523 8 24 8.44772 24 9C24 9.55228 23.5523 10 23 10H19V21C19 21.5523 18.5523 22 18 22C17.4477 22 17 21.5523 17 21V10H13C12.4477 10 12 9.55228 12 9C12 8.44772 12.4477 8 13 8H23Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SliderIconLetterSpacing(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      {...props}
    >
      <path
        d="M23 18C23.5523 18 24 18.4477 24 19V23C24 23.5523 23.5523 24 23 24C22.4477 24 22 23.5523 22 23V22H2V23C2 23.5523 1.55228 24 1 24C0.447715 24 -9.10697e-09 23.5523 0 23V19C4.13198e-08 18.4477 0.447715 18 1 18C1.55228 18 2 18.4477 2 19V20H22V19C22 18.4477 22.4477 18 23 18Z"
        fill="currentColor"
      />
      <path
        d="M18 0C18.5523 1.93276e-07 19 0.447715 19 1C19 1.55228 18.5523 2 18 2H13V15C13 15.5523 12.5523 16 12 16C11.4477 16 11 15.5523 11 15V2H6C5.44772 2 5 1.55228 5 1C5 0.447715 5.44772 2.41596e-08 6 0H18Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SliderIconLineHeight(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      {...props}
    >
      <path
        d="M5 0C5.55228 7.74162e-07 6 0.447716 6 1C6 1.55228 5.55228 2 5 2H4V22H5C5.55228 22 6 22.4477 6 23C6 23.5523 5.55228 24 5 24H1C0.447715 24 1.70775e-07 23.5523 0 23C4.82823e-08 22.4477 0.447715 22 1 22H2V2H1C0.447715 2 1.70775e-07 1.55228 0 1C4.82823e-08 0.447715 0.447715 -4.82823e-08 1 0H5Z"
        fill="currentColor"
      />
      <path
        d="M18 19C18 19.5523 17.5523 20 17 20C16.4477 20 16 19.5523 16 19V6H11C10.4477 6 10 5.55228 10 5C10 4.44772 10.4477 4 11 4H23C23.5523 4 24 4.44772 24 5C24 5.55228 23.5523 6 23 6H18V19Z"
        fill="currentColor"
      />
    </svg>
  );
}

const charsFromCodePointRange = (start, end) =>
  Array.from({ length: end - start + 1 }, (_, i) => String.fromCodePoint(start + i)).join('');

const WINDOWS_1252_PUNCTUATION =
  '\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178';

// Наборы символов для быстрых текстовых пресетов
const glyphSets = {
  // Базовые ASCII-символы и пунктуация (совпадает с дефолтом превью)
  entire: ENTIRE_PRINTABLE_ASCII_SAMPLE,
  
  // MacOS Roman (базовые символы)
  macos: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-={}[]|\\:;"\'<>,.?/',
  
  // Basic Latin (базовые латинские символы)
  basic: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  
  // Latin Extended-A
  latin_extended: charsFromCodePointRange(0x0100, 0x017f),
  
  // Краткий обзор
  overview: 'ABCabc123',
  
  // Windows-1252 (дополнительная пунктуация + Latin-1)
  windows1252: `${WINDOWS_1252_PUNCTUATION}${charsFromCodePointRange(0x00a0, 0x00ff)}`,
  
  // Latin-1 Supplement
  latin_supplement: charsFromCodePointRange(0x00a1, 0x00ff),
};

export default function Sidebar({
  selectedFont,
  isLibraryTab = false,
  activeLibraryId = null,
  fontLibraries = [],
  onOpenFontLibrary,
  onCreateFontLibrary,
  onUpdateFontLibrary,
  onDeleteFontLibrary,
  onReorderFontLibraries,
  onAddFontToLibrary,
  createLibrarySeedRequest = null,
  onCreateLibrarySeedHandled,
  setSelectedFont,
  isAnimating,
  toggleAnimation,
  sampleTexts,
  availableStyles,
  selectedPresetName,
  applyPresetStyle,
  getVariableAxes,
  handleVariableSettingsChange,
  variableSettings,
  resetVariableSettings,
}) {
  // Получаем настройки из контекста
  const { 
    text, setText, 
    fontSize, setFontSize, 
    glyphsFontSize, setGlyphsFontSize,
    stylesFontSize, setStylesFontSize,
    lineHeight, setLineHeight, 
    letterSpacing, setLetterSpacing, 
    stylesLetterSpacing, setStylesLetterSpacing,
    textColor, setTextColor, 
    backgroundColor, setBackgroundColor, 
    textDirection, setTextDirection, 
    textAlignment, setTextAlignment, 
    textCase, setTextCase,
    textDecoration,
    setTextDecoration,
    textColumns,
    setTextColumns,
    waterfallRows,
    setWaterfallRows,
    waterfallBaseSize,
    setWaterfallBaseSize,
    waterfallEditTarget,
    setWaterfallEditTarget,
    waterfallHeadingPresetName,
    setWaterfallHeadingPresetName,
    waterfallBodyPresetName,
    setWaterfallBodyPresetName,
    waterfallHeadingLineHeight,
    setWaterfallHeadingLineHeight,
    waterfallBodyLineHeight,
    setWaterfallBodyLineHeight,
    waterfallHeadingLetterSpacing,
    setWaterfallHeadingLetterSpacing,
    waterfallBodyLetterSpacing,
    setWaterfallBodyLetterSpacing,
    waterfallScaleRatio,
    setWaterfallScaleRatio,
    waterfallUnit,
    setWaterfallUnit,
    waterfallRoundPx,
    setWaterfallRoundPx,
    verticalAlignment,
    setVerticalAlignment,
    textFill, setTextFill,
    darkTheme,
    setDarkTheme,
    previewBackgroundImage,
    setPreviewBackgroundImage,
    viewMode,
    setViewMode,
} = useSettings();

  const { resetSelectedFontState, fonts: sessionFonts } = useFontContext();
  const isGlyphsView = viewMode === 'glyphs';
  const isStylesView = viewMode === 'styles';
  const isWaterfallView = viewMode === 'waterfall';

  const waterfallScaleKey = useMemo(() => {
    const r = Number(waterfallScaleRatio);
    if (!Number.isFinite(r)) return 'custom';
    const hit = WATERFALL_SCALE_PRESETS.find((p) => Math.abs(p.ratio - r) <= 0.0005);
    return hit ? hit.key : 'custom';
  }, [waterfallScaleRatio]);
  const [waterfallScaleSelectKey, setWaterfallScaleSelectKey] = useState(waterfallScaleKey);

  useEffect(() => {
    setWaterfallScaleSelectKey((prev) => (prev === 'custom' ? prev : waterfallScaleKey));
  }, [waterfallScaleKey]);

  /** Выбранный быстрый пресет: `sample:*` или `glyph:*` (`glyph:entire` по умолчанию). */
  const [sidebarTextPreset, setSidebarTextPreset] = useState('glyph:entire');
  const [activeColorTab, setActiveColorTab] = useState('foreground'); // foreground или background
  // Рефы для цветовых полей
  const fgColorFieldRef = useRef(null);
  const bgColorFieldRef = useRef(null);
  const previewBgFileInputRef = useRef(null);
  const fgColorSliderRef = useRef(null);
  const bgColorSliderRef = useRef(null);
  
  // Координаты кружков в цветовых полях
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
  
  // Состояния для отслеживания перетаскивания
  const [isDraggingFgField, setIsDraggingFgField] = useState(false);
  const [isDraggingBgField, setIsDraggingBgField] = useState(false);
  const [isDraggingFgSlider, setIsDraggingFgSlider] = useState(false);
  const [isDraggingBgSlider, setIsDraggingBgSlider] = useState(false);
  
  // Режим отображения цвета (hex или rgb)
  const [fgColorMode, setFgColorMode] = useState('hex'); // для текста
  const [bgColorMode, setBgColorMode] = useState('hex'); // для фона
  
  const pickSidebarTextPreset = useCallback(
    (kind, itemKey) => {
      if (kind === 'sample') {
        const val = sampleTexts?.[itemKey];
        if (typeof val === 'string') {
          setSidebarTextPreset(`sample:${itemKey}`);
          setText(val);
        }
        return;
      }
      const content = glyphSets[itemKey];
      if (content) {
        setSidebarTextPreset(`glyph:${itemKey}`);
        setText(content);
      }
    },
    [sampleTexts, setText],
  );

  /** При смене шрифта ставим полный набор символов по умолчанию. */
  useEffect(() => {
    if (!selectedFont?.id) return;
    setSidebarTextPreset('glyph:entire');
    setText(ENTIRE_PRINTABLE_ASCII_SAMPLE);
  }, [selectedFont?.id, setText]);

  // Получаем название пресета из веса и стиля
  // Удаляем локальную функцию
  /* 
  const getPresetNameFromWeightAndStyle = (weight, style) => {
    const preset = presetStyles.find(p => p.weight === weight && p.style === style);
    return preset ? preset.name : 'Regular';
  };
  */
  
  // Получение HSL-цвета для градиента выбора оттенка
  const getHueColor = (hue) => {
    return `hsl(${hue}, 100%, 50%)`;
  };

  // Обновляем положение маркеров при монтировании компонента
  useEffect(() => {
    if (textColor && textColor.startsWith('#')) {
      const [h, s, v] = hexToHsv(textColor);
      const leftPos = `${s}%`;
      const topPos = `${100 - v}%`;
      setFgColorPos({ left: leftPos, top: topPos });
      setFgSliderPos(`${h / 3.6}%`);
    }
    
    if (backgroundColor && backgroundColor.startsWith('#')) {
      const [h, s, v] = hexToHsv(backgroundColor);
      const leftPos = `${s}%`;
      const topPos = `${100 - v}%`;
      setBgColorPos({ left: leftPos, top: topPos });
      setBgSliderPos(`${h / 3.6}%`);
    }
  }, [textColor, backgroundColor]);

  // Обновляем положение маркеров при смене вкладки и цветов
  useEffect(() => {
    // Если активна вкладка фона, обновляем позицию маркера фона.
    if (activeColorTab === 'background' && backgroundColor && backgroundColor.startsWith('#')) {
      const [h, s, v] = hexToHsv(backgroundColor);
      // Убеждаемся, что выставляем корректные проценты для CSS
      const leftPos = `${s}%`;
      const topPos = `${100 - v}%`;
      setBgColorPos({ left: leftPos, top: topPos });
      setBgSliderPos(`${h / 3.6}%`);
    }
    
    // Если активна вкладка текста, обновляем позицию маркера текста
    if (activeColorTab === 'foreground' && textColor && textColor.startsWith('#')) {
      const [h, s, v] = hexToHsv(textColor);
      const leftPos = `${s}%`;
      const topPos = `${100 - v}%`;
      setFgColorPos({ left: leftPos, top: topPos });
      setFgSliderPos(`${h / 3.6}%`);
    }
  }, [activeColorTab, backgroundColor, textColor]);

  // Создание цвета из HSV-компонентов
  const createColorFromHSV = (h, s, v) => {
    const rgb = hsvToRgb(h, s, v);
    return rgbToHex(rgb[0], rgb[1], rgb[2]);
  };

  // Обработчик поля выбора цвета
  const handleColorFieldClick = (e, isBackground) => {
    const field = isBackground ? bgColorFieldRef.current : fgColorFieldRef.current;
    if (!field) return;
    
    // Получаем координаты внутреннего контейнера
    const innerField = field.querySelector('.absolute.inset-0.p-3 > div');
    const rect = innerField.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Позиция в процентах
    const xPercent = Math.min(100, Math.max(0, (x / rect.width) * 100));
    const yPercent = Math.min(100, Math.max(0, (y / rect.height) * 100));
    
    // Обновляем позицию маркера
    if (isBackground) {
      setBgColorPos({ left: `${xPercent}%`, top: `${yPercent}%` });
      
      // Получаем текущий оттенок из позиции слайдера
      const hue = parseFloat(bgSliderPos) * 3.6; // 0-360
      // Получаем насыщенность и яркость из позиции маркера
      const saturation = xPercent / 100;
      const value = 1 - (yPercent / 100);
      
      // Создаём цвет
      const newColor = createColorFromHSV(hue, saturation, value);
      setBackgroundColor(newColor);
    } else {
      setFgColorPos({ left: `${xPercent}%`, top: `${yPercent}%` });
      
      // Получаем текущий оттенок из позиции слайдера
      const hue = parseFloat(fgSliderPos) * 3.6; // 0-360
      // Получаем насыщенность и яркость из позиции маркера
      const saturation = xPercent / 100;
      const value = 1 - (yPercent / 100);
      
      // Создаём цвет
      const newColor = createColorFromHSV(hue, saturation, value);
      setTextColor(newColor);
    }
  };
  
  // Обработчик слайдера выбора оттенка
  const handleColorSliderClick = (e, isBackground) => {
    const slider = isBackground ? bgColorSliderRef.current : fgColorSliderRef.current;
    if (!slider) return;
    
    // Получаем координаты внутреннего контейнера с градиентом
    const innerSlider = slider.querySelector('.absolute.inset-0.px-3 > div');
    const rect = innerSlider.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // Получаем ширину внутреннего слайдера
    const sliderWidth = rect.width;
    
    // Ограничиваем позицию в пределах слайдера
    const percentage = Math.min(100, Math.max(0, (x / sliderWidth) * 100));
    
    if (isBackground) {
      setBgSliderPos(`${percentage}%`);
      
      // Получаем текущую позицию маркера
      const saturation = parseFloat(bgColorPos.left) / 100;
      const value = 1 - (parseFloat(bgColorPos.top) / 100);
      
      // Новый оттенок (H) из позиции слайдера
      const hue = percentage * 3.6; // 0-360
      
      // Создаём цвет, сохраняя S и V
      const newColor = createColorFromHSV(hue, saturation, value);
      setBackgroundColor(newColor);
    } else {
      setFgSliderPos(`${percentage}%`);
      
      // Получаем текущую позицию маркера
      const saturation = parseFloat(fgColorPos.left) / 100;
      const value = 1 - (parseFloat(fgColorPos.top) / 100);
      
      // Новый оттенок (H) из позиции слайдера
      const hue = percentage * 3.6; // 0-360
      
      // Создаём цвет, сохраняя S и V
      const newColor = createColorFromHSV(hue, saturation, value);
      setTextColor(newColor);
    }
  };

  // Отслеживаем события мыши для перетаскивания
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingFgField) {
        e.preventDefault();
        handleColorFieldClick(e, false);
      } else if (isDraggingBgField) {
        e.preventDefault();
        handleColorFieldClick(e, true);
      } else if (isDraggingFgSlider) {
        e.preventDefault();
        handleColorSliderClick(e, false);
      } else if (isDraggingBgSlider) {
        e.preventDefault();
        handleColorSliderClick(e, true);
      }
    };
    
    const handleMouseUp = () => {
      setIsDraggingFgField(false);
      setIsDraggingBgField(false);
      setIsDraggingFgSlider(false);
      setIsDraggingBgSlider(false);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingFgField, isDraggingBgField, isDraggingFgSlider, isDraggingBgSlider]);

  const handleRgbChannelChange = useCallback(
    (channel, raw, isBackground) => {
      const setColor = isBackground ? setBackgroundColor : setTextColor;
      const currentHex = isBackground ? backgroundColor : textColor;
      const { r, g, b } = hexToRgbComponents(currentHex);
      const trimmed = String(raw).trim();
      const parsed = trimmed === '' ? NaN : parseInt(trimmed, 10);
      const n = Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(255, parsed));
      const next = { r, g, b, [channel]: n };
      setColor(rgbToHex(next.r, next.g, next.b));
    },
    [backgroundColor, textColor, setBackgroundColor, setTextColor]
  );

  // Проверка: является ли шрифт вариативным
  const isVariableEnabled = () => {
    if (!selectedFont) return false;
    if (!selectedFont.isVariableFont) return false;
    const hasAxes = Boolean(selectedFont.variableAxes && Object.keys(selectedFont.variableAxes).length > 0);
    const hasItalicCapability = Boolean(
      selectedFont.italicMode === 'axis-ital' ||
      selectedFont.italicMode === 'axis-slnt' ||
      selectedFont.italicMode === 'separate-style' ||
      selectedFont.hasItalicStyles
    );
    return hasAxes || hasItalicCapability;
  };

  const sidebarPresetOptions = useMemo(
    () =>
      (availableStyles || []).map((preset) => ({
        value: preset.name,
        label: preset.name,
        style: { fontWeight: preset.weight, fontStyle: preset.style },
      })),
    [availableStyles],
  );

  const activeWaterfallPresetName =
    waterfallEditTarget === 'body' ? waterfallBodyPresetName : waterfallHeadingPresetName;

  // Обработчик двойного клика по шрифту для открытия редактора стилей
  const handleFontDoubleClick = () => {
    if (selectedFont && selectedFont.isVariableFont && selectedFont.variableAxes) {
      // Активируем режим вариативного шрифта
      setVariationSettingsOpen(true);
    }
  };

  // Обработчики управления текстом (используют сеттеры из useSettings)
  const changeTextAlignmentHandler = useCallback((alignment) => {
    setTextAlignment(alignment);
  }, [setTextAlignment]);

  const toggleTextFillHandler = useCallback(() => {
    setTextFill((prev) => {
      const next = !prev;
      if (next) {
        setTextAlignment('center');
        setVerticalAlignment('middle');
      }
      return next;
    });
  }, [setTextAlignment, setTextFill, setVerticalAlignment]);

  const clampColumns = useCallback((n) => {
    const x = Math.round(Number(n));
    if (!Number.isFinite(x)) return 1;
    return Math.max(1, Math.min(4, x));
  }, []);

  const decColumns = useCallback(() => {
    setTextColumns((c) => clampColumns((Number(c) || 1) - 1));
  }, [clampColumns, setTextColumns]);

  const incColumns = useCallback(() => {
    setTextColumns((c) => clampColumns((Number(c) || 1) + 1));
  }, [clampColumns, setTextColumns]);

  const clampWaterfallRows = useCallback((n) => {
    const x = Math.round(Number(n));
    if (!Number.isFinite(x)) return 20;
    return Math.max(1, Math.min(40, x));
  }, []);

  const decWaterfallRows = useCallback(() => {
    setWaterfallRows((c) => clampWaterfallRows((Number(c) || 20) - 1));
  }, [clampWaterfallRows, setWaterfallRows]);

  const incWaterfallRows = useCallback(() => {
    setWaterfallRows((c) => clampWaterfallRows((Number(c) || 20) + 1));
  }, [clampWaterfallRows, setWaterfallRows]);

  const handlePreviewBackgroundFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        toast.error('Выберите файл изображения');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPreviewBackgroundImage(reader.result);
        }
      };
      reader.onerror = () => toast.error('Не удалось прочитать файл');
      reader.readAsDataURL(file);
    },
    [setPreviewBackgroundImage],
  );

  const sidebarScrollRef = useRef(null);
  const sidebarScrollIdleTimerRef = useRef(null);
  const settingsPopoverRef = useRef(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAppSettingsOpen, setIsAppSettingsOpen] = useState(false);
  const [sidebarScrollbarVisible, setSidebarScrollbarVisible] = useState(false);
  const [sidebarScrollLayout, setSidebarScrollLayout] = useState({
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0,
  });

  const syncSidebarScrollLayout = useCallback(() => {
    const el = sidebarScrollRef.current;
    if (!el) return;
    setSidebarScrollLayout({
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    });
  }, []);

  const onSidebarScroll = useCallback(() => {
    syncSidebarScrollLayout();
    setSidebarScrollbarVisible(true);
    if (sidebarScrollIdleTimerRef.current) {
      clearTimeout(sidebarScrollIdleTimerRef.current);
    }
    sidebarScrollIdleTimerRef.current = setTimeout(() => {
      setSidebarScrollbarVisible(false);
      sidebarScrollIdleTimerRef.current = null;
    }, 700);
  }, [syncSidebarScrollLayout]);

  useLayoutEffect(() => {
    syncSidebarScrollLayout();
  }, [syncSidebarScrollLayout]);

  useEffect(() => {
    const el = sidebarScrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', onSidebarScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onSidebarScroll);
      if (sidebarScrollIdleTimerRef.current) {
        clearTimeout(sidebarScrollIdleTimerRef.current);
      }
    };
  }, [onSidebarScroll]);

  useEffect(() => {
    const el = sidebarScrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => syncSidebarScrollLayout());
    ro.observe(el);
    return () => ro.disconnect();
  }, [syncSidebarScrollLayout]);

  useEffect(() => {
    const el = sidebarScrollRef.current;
    if (!el) return;
    let t;
    const mo = new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => syncSidebarScrollLayout(), 64);
    });
    mo.observe(el, { subtree: true, childList: true, attributes: true, characterData: true });
    return () => {
      clearTimeout(t);
      mo.disconnect();
    };
  }, [syncSidebarScrollLayout]);

  useEffect(() => {
    if (!isAppSettingsOpen) return;

    const onPointerDown = (event) => {
      const root = settingsPopoverRef.current;
      if (!root || root.contains(event.target)) return;
      setIsAppSettingsOpen(false);
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsAppSettingsOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isAppSettingsOpen]);

  const sidebarOverlayThumb = useMemo(() => {
    const { scrollTop, scrollHeight, clientHeight } = sidebarScrollLayout;
    /** Совпадает с `top-2` / `bottom-2` у дорожки полосы (0.5rem ~= 8px). */
    const trackInsetPx = 8;
    if (clientHeight < 1 || scrollHeight <= clientHeight + 1) return null;
    const trackH = clientHeight - 2 * trackInsetPx;
    if (trackH < 24) return null;
    const thumbH = Math.max(24, Math.round((clientHeight / scrollHeight) * trackH));
    const maxScroll = scrollHeight - clientHeight;
    const top = maxScroll > 0 ? (scrollTop / maxScroll) * (trackH - thumbH) : 0;
    return { thumbH, top };
  }, [sidebarScrollLayout]);

  return (
    <div
      className={`flex h-screen min-h-0 flex-col overflow-hidden border-r border-gray-200 bg-white shadow-sm transition-[width] duration-200 ${
        isSidebarCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex h-12 min-h-12 shrink-0 items-center justify-center border-b border-gray-200 px-4">
        {isSidebarCollapsed ? (
          <span className="text-xs font-semibold uppercase text-gray-700">DF</span>
        ) : (
          <img src="/logo/Logo%20Dinamic.svg" alt="Dynamic font" className="w-auto select-none" />
        )}
      </div>

      {!isSidebarCollapsed ? (
      <div className="relative min-h-0 flex flex-1 flex-col">
        <div
          ref={sidebarScrollRef}
          className="editor-sidebar-scroll flex min-h-0 flex-1 flex-col overflow-y-auto"
        >
      {isLibraryTab ? (
        <FontLibrarySidebar
          sessionFonts={sessionFonts}
          libraries={fontLibraries}
          activeLibraryId={activeLibraryId}
          onOpenLibrary={onOpenFontLibrary}
          onCreateLibrary={onCreateFontLibrary}
          onUpdateLibrary={onUpdateFontLibrary}
          onDeleteLibrary={onDeleteFontLibrary}
          onReorderLibraries={onReorderFontLibraries}
          onAddFontToLibrary={onAddFontToLibrary}
          createLibrarySeedRequest={createLibrarySeedRequest}
          onCreateLibrarySeedHandled={onCreateLibrarySeedHandled}
        />
      ) : (
        <>
      <div
        className="flex h-12 min-h-12 shrink-0 items-center bg-white px-4 pt-4"
        role="toolbar"
        aria-label="Режим превью"
      >
        <SegmentedControl
          value={viewMode}
          onChange={setViewMode}
          options={VIEW_MODE_OPTIONS}
          variant="surface"
          className="w-full min-w-0"
        />
      </div>
      
          {/* Базовые настройки шрифта */}
      <div className="p-4">
        <div>
          
          {isWaterfallView && (
            <div className="mb-3 min-w-0">
              <SegmentedControl
                variant="surface"
                value={waterfallEditTarget}
                onChange={(v) => {
                  if (v === 'heading' || v === 'body') setWaterfallEditTarget(v);
                }}
                options={[
                  { value: 'heading', label: 'H' },
                  { value: 'body', label: 'Body' },
                ]}
                className="w-full min-w-0"
              />
            </div>
          )}

          {selectedFont && availableStyles?.length > 0 && (
            <div className="mb-3 min-w-0">
              <CustomSelect
                id="sidebar-preset-style"
                value={isWaterfallView ? activeWaterfallPresetName : selectedPresetName}
                onChange={(v) => {
                  if (isWaterfallView) {
                    if (waterfallEditTarget === 'body') setWaterfallBodyPresetName(v);
                    else setWaterfallHeadingPresetName(v);
                    return;
                  }
                  applyPresetStyle(v);
                }}
                options={sidebarPresetOptions}
                className={sidebarSelectClass}
                aria-label="Начертание (пресет)"
              />
            </div>
          )}
          
          <div
            className="mb-3 flex items-center gap-2"
            role="group"
            aria-label="Размер шрифта (TT)"
          >
            <Tooltip content="Размер шрифта">
              <span className="flex h-8 w-5 shrink-0 items-center justify-center text-gray-800">
                <SliderIconFontSize />
              </span>
            </Tooltip>
            <div className="min-w-0 flex-1">
              <DraggableValueRangeSlider
                min={12}
                max={300}
                step={1}
                value={
                  viewMode === 'waterfall'
                    ? waterfallBaseSize
                    : viewMode === 'glyphs'
                      ? glyphsFontSize
                      : viewMode === 'styles'
                        ? stylesFontSize
                      : fontSize
                }
                onChange={
                  viewMode === 'waterfall'
                    ? setWaterfallBaseSize
                    : viewMode === 'glyphs'
                      ? setGlyphsFontSize
                      : viewMode === 'styles'
                        ? setStylesFontSize
                      : setFontSize
                }
                formatDisplay={(v) => String(Math.round(v))}
              />
            </div>
          </div>

          <div
            className="mb-3 flex items-center gap-2"
            role="group"
            aria-label="Межбуквенный интервал"
          >
            <Tooltip content="Межбуквенный интервал">
              <span className="flex h-8 w-5 shrink-0 items-center justify-center text-gray-800">
                <SliderIconLetterSpacing />
              </span>
            </Tooltip>
            <div className="min-w-0 flex-1">
              <DraggableValueRangeSlider
                min={-100}
                max={100}
                step={1}
                value={
                  isWaterfallView
                    ? waterfallEditTarget === 'body'
                      ? waterfallBodyLetterSpacing
                      : waterfallHeadingLetterSpacing
                    : isStylesView
                      ? stylesLetterSpacing
                    : letterSpacing
                }
                disabled={isGlyphsView}
                onChange={(v) => {
                  if (isWaterfallView) {
                    if (waterfallEditTarget === 'body') setWaterfallBodyLetterSpacing(v);
                    else setWaterfallHeadingLetterSpacing(v);
                  } else if (isStylesView) {
                    setStylesLetterSpacing(v);
                  } else {
                    setLetterSpacing(v);
                  }
                }}
                formatDisplay={(v) => String(Math.round(v))}
              />
            </div>
          </div>

          <div
            className="mb-3 flex items-center gap-2"
            role="group"
            aria-label="Межстрочный интервал (TT)"
          >
            <Tooltip content="Межстрочный интервал">
              <span className="flex h-8 w-5 shrink-0 items-center justify-center text-gray-800">
                <SliderIconLineHeight />
              </span>
            </Tooltip>
            <div className="min-w-0 flex-1">
              <DraggableValueRangeSlider
                min={0.5}
                max={3}
                step={0.05}
                value={
                  isWaterfallView
                    ? waterfallEditTarget === 'body'
                      ? waterfallBodyLineHeight
                      : waterfallHeadingLineHeight
                    : lineHeight
                }
                disabled={isGlyphsView || isStylesView}
                onChange={(v) => {
                  if (isWaterfallView) {
                    if (waterfallEditTarget === 'body') setWaterfallBodyLineHeight(v);
                    else setWaterfallHeadingLineHeight(v);
                  } else {
                    setLineHeight(v);
                  }
                }}
                formatDisplay={(v) => Number(v).toFixed(2)}
              />
            </div>
          </div>
          
          {/* Текст: выравнивание + заполнение; справа регистры Аа/АА */}
          <div className="mb-4 flex flex-col gap-2">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <SegmentedControl
                variant="iconRail"
                value={textAlignment}
                onChange={changeTextAlignmentHandler}
                options={SIDEBAR_TEXT_ALIGN_OPTIONS}
                className="min-w-0 flex-[4]"
                disabled={isGlyphsView}
              />
              <SegmentedControl
                variant="iconRail"
                value={verticalAlignment}
                onChange={setVerticalAlignment}
                options={SIDEBAR_VERTICAL_ALIGN_OPTIONS}
                className="min-w-0 flex-[3]"
                disabled={viewMode === 'waterfall' || isGlyphsView || isStylesView}
              />
            </div>
            <div className="flex min-h-8 min-w-0 items-stretch gap-2">
              <div className="flex min-w-0 flex-[4] items-stretch gap-2">
                <SegmentedControl
                  variant="iconRail"
                  value={textCase}
                  onChange={setTextCase}
                  options={SIDEBAR_TEXT_CASE_OPTIONS}
                  className="min-w-0 flex-1"
                  disabled={isGlyphsView}
                />
                <SegmentedControl
                  variant="iconRail"
                  value={textDecoration}
                  onChange={(v) => setTextDecoration(v === textDecoration ? 'none' : v)}
                  options={SIDEBAR_TEXT_DECORATION_OPTIONS}
                  className="min-w-0 flex-1"
                  disabled={isGlyphsView}
                />
              </div>
              <div className="min-w-0 flex-[3]">
                <div className="flex min-w-0 items-stretch justify-end gap-2">
                  <div className="flex min-w-0 flex-1 items-stretch overflow-hidden rounded-md bg-gray-50">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={viewMode === 'waterfall' ? waterfallRows : textColumns}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (viewMode === 'waterfall') setWaterfallRows(clampWaterfallRows(v));
                        else setTextColumns(clampColumns(v));
                      }}
                      onBlur={() => {
                        if (viewMode === 'waterfall') setWaterfallRows(clampWaterfallRows(waterfallRows));
                        else setTextColumns(clampColumns(textColumns));
                      }}
                      disabled={isGlyphsView || isStylesView}
                      className="min-w-0 flex-1 border-0 bg-transparent px-2 text-center text-xs font-semibold tabular-nums text-gray-800 focus:outline-none disabled:text-gray-400"
                      aria-label={viewMode === 'waterfall' ? 'Количество рядов Waterfall' : 'Количество колонок'}
                    />
                    <div className="flex w-5 flex-col border-l border-gray-200">
                      <button
                        type="button"
                        className="flex flex-1 items-end justify-center text-gray-700 hover:bg-black/[0.06] disabled:text-gray-400 disabled:hover:bg-transparent"
                        aria-label={viewMode === 'waterfall' ? 'Увеличить ряды' : 'Увеличить колонки'}
                        onClick={viewMode === 'waterfall' ? incWaterfallRows : incColumns}
                        disabled={isGlyphsView || isStylesView}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3 w-3" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="flex flex-1 items-start justify-center text-gray-700 hover:bg-black/[0.06] disabled:text-gray-400 disabled:hover:bg-transparent"
                        aria-label={viewMode === 'waterfall' ? 'Уменьшить ряды' : 'Уменьшить колонки'}
                        onClick={viewMode === 'waterfall' ? decWaterfallRows : decColumns}
                        disabled={isGlyphsView || isStylesView}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3 w-3" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className={`${ICON_RAIL_TRACK_CLASS} inline-flex`.trim()}>
                    <Tooltip content="Заполнить на весь экран">
                      <button
                        type="button"
                        className={`${iconRailSegmentClass(textFill)} w-8 flex-none disabled:opacity-40`.trim()}
                        aria-label="Заполнить экран текстом"
                        aria-pressed={textFill}
                        disabled={viewMode === 'waterfall' || isGlyphsView || isStylesView}
                        onClick={toggleTextFillHandler}
                      >
                        <IconTextFillExpand className="h-4 w-4 shrink-0" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>
            {viewMode === 'waterfall' && (
              <div className="flex min-w-0 flex-col gap-2">
                <CustomSelect
                  id="sidebar-waterfall-scale"
                  value={waterfallScaleSelectKey}
                  onChange={(v) => {
                    if (v === 'custom') {
                      setWaterfallScaleSelectKey('custom');
                      return;
                    }
                    const p = WATERFALL_SCALE_PRESETS.find((x) => x.key === v);
                    if (p) {
                      setWaterfallScaleSelectKey(v);
                      setWaterfallScaleRatio(p.ratio);
                    }
                  }}
                  options={[
                    ...WATERFALL_SCALE_PRESETS.map((p) => ({ value: p.key, label: p.label })),
                    { value: 'custom', label: 'Enter value...' },
                  ]}
                  className={sidebarSelectClass}
                  aria-label="Waterfall: шкала"
                />
                {waterfallScaleSelectKey === 'custom' ? (
                  <input
                    type="number"
                    step={0.001}
                    inputMode="decimal"
                    value={Number.isFinite(Number(waterfallScaleRatio)) ? waterfallScaleRatio : ''}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (Number.isFinite(v)) setWaterfallScaleRatio(v);
                    }}
                    onBlur={() => {
                      const v = Number(waterfallScaleRatio);
                      if (!Number.isFinite(v)) return;
                      const clamped = Math.max(1.001, Math.min(3, v));
                      setWaterfallScaleRatio(clamped);
                    }}
                    className="no-arrows h-8 w-full rounded-md border border-gray-50 bg-gray-50 px-2 text-xs tabular-nums text-gray-800 focus:border-black/[0.14] focus:outline-none"
                    aria-label="Waterfall: коэффициент"
                  />
                ) : null}
                <div className="flex min-w-0 items-stretch gap-2">
                  <SegmentedControl
                    variant="surface"
                    value={waterfallUnit}
                    onChange={(u) => {
                      if (u === 'px' || u === 'rem' || u === 'pt') setWaterfallUnit(u);
                    }}
                    options={[
                      { value: 'px', label: 'PX' },
                      { value: 'rem', label: 'REM' },
                      { value: 'pt', label: 'PT' },
                    ]}
                    className="min-w-0 flex-1"
                  />
                  <Tooltip content={waterfallRoundPx === false ? 'Округление: выкл.' : 'Округление: вкл.'}>
                    <IconCircleButton
                      variant="toolbar"
                      pressed={waterfallRoundPx !== false}
                      aria-pressed={waterfallRoundPx !== false}
                      aria-label="Переключить округление размеров Waterfall"
                      onClick={() => setWaterfallRoundPx((v) => !v)}
                    >
                      <IconRoundingUp className="h-4 w-4 shrink-0" />
                    </IconCircleButton>
                  </Tooltip>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Variable Axes — только для вариативных шрифтов с осями */}
        {selectedFont && isVariableEnabled() && (
          <div
            className={`-mx-4 border-t border-gray-200 px-4 pt-4 mb-4 ${
              isStylesView ? 'pointer-events-none opacity-40' : ''
            }`.trim()}
            aria-disabled={isStylesView || undefined}
          >
            <VariableFontControls 
              font={selectedFont} 
              onSettingsChange={handleVariableSettingsChange}
              isAnimating={isAnimating}
              toggleAnimation={toggleAnimation}
            />
          </div>
        )}
        
        {/* Секция настроек цвета */}
        <div className="-mx-4 border-t border-gray-200 px-4 pt-4 mb-4">
          
          <div className="mb-3 flex min-w-0 items-center gap-2">
            <SegmentedControl
              variant="surface"
              className="min-w-0 flex-1"
              value={activeColorTab}
              onChange={setActiveColorTab}
              options={[
                { value: 'foreground', label: 'Текст' },
                { value: 'background', label: 'Фон' },
              ]}
            />
            <Tooltip content="Поменять цвета местами">
              <IconCircleButton
                variant="toolbar"
                onClick={() => {
                  const tempColor = textColor;
                  const tempPos = fgColorPos;
                  const tempSliderPos = fgSliderPos;

                  setTextColor(backgroundColor);
                  setFgColorPos(bgColorPos);
                  setFgSliderPos(bgSliderPos);

                  setBackgroundColor(tempColor);
                  setBgColorPos(tempPos);
                  setBgSliderPos(tempSliderPos);
                }}
                aria-label="Поменять цвета текста и фона местами"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </IconCircleButton>
            </Tooltip>
            <input
              ref={previewBgFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              aria-hidden
              onChange={handlePreviewBackgroundFileChange}
            />
            <Tooltip
              content={
                previewBackgroundImage
                  ? 'Убрать фоновое изображение с превью'
                  : 'Фон области превью'
              }
            >
              <IconCircleButton
                variant="toolbar"
                pressed={Boolean(previewBackgroundImage)}
                onClick={() => {
                  if (previewBackgroundImage) {
                    setPreviewBackgroundImage(null);
                  } else {
                    previewBgFileInputRef.current?.click();
                  }
                }}
                aria-label={
                  previewBackgroundImage
                    ? 'Убрать фоновое изображение с превью'
                    : 'Фон области превью'
                }
                aria-pressed={Boolean(previewBackgroundImage)}
              >
              {previewBackgroundImage ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                  <path d="M5.25328 11.3994C5.94429 9.90223 8.04865 9.83719 8.83043 11.2891L14.0199 20.9258L16.7572 16.0596C17.5218 14.7003 19.4789 14.7003 20.2435 16.0596L23.8714 22.5098C24.1422 22.9911 23.9718 23.6003 23.4906 23.8711C23.0093 24.1418 22.4001 23.9714 22.1293 23.4902L18.5004 17.04L15.763 21.9072C14.9903 23.2808 13.0054 23.2617 12.2582 21.874L7.06969 12.2373L1.90855 23.4189C1.67714 23.9203 1.08282 24.1395 0.581405 23.9082C0.0800149 23.6768 -0.139152 23.0825 0.0921474 22.5811L5.25328 11.3994Z" fill="currentColor"/>
                  <path d="M17.0004 5C17.0004 6.65685 15.6572 8 14.0004 8C12.3435 8 11.0004 6.65685 11.0004 5C11.0004 3.34315 12.3435 2 14.0004 2C15.6572 2 17.0004 3.34315 17.0004 5Z" fill="currentColor"/>
                </svg>
              )}
              </IconCircleButton>
            </Tooltip>
          </div>
          
          {activeColorTab === 'foreground' ? (
            <div>
              <div 
                ref={fgColorFieldRef}
                className="rounded-xl h-24 mb-3 relative cursor-pointer"
                onClick={(e) => handleColorFieldClick(e, false)}
                onMouseDown={(e) => {
                  handleColorFieldClick(e, false);
                  setIsDraggingFgField(true);
                }}
                style={{
                  background: `linear-gradient(to right, white, ${getHueColor(parseFloat(fgSliderPos) * 3.6)}), linear-gradient(to bottom, transparent, black)`,
                  backgroundBlendMode: 'multiply'
                }}
              >
                <div className="absolute inset-0 p-3">
                  <div 
                    className="w-full h-full rounded-md relative"
                    style={{
                      
                    }}
                  >
                    <div 
                      className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2"
                      style={{ 
                        backgroundColor: textColor,
                        left: fgColorPos.left, 
                        top: fgColorPos.top 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div 
                ref={fgColorSliderRef}
                className="h-6 rounded-xl mb-3 relative cursor-pointer"
                onClick={(e) => handleColorSliderClick(e, false)}
                onMouseDown={(e) => {
                  handleColorSliderClick(e, false);
                  setIsDraggingFgSlider(true);
                }}
                style={{
                  background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                  boxSizing: 'border-box',
                  padding: '0'
                }}
              >
                <div className="absolute inset-0 px-3">
                  <div 
                    className="w-full h-full rounded-md relative"
                    style={{
                    }}
                  >
                    <div 
                      className="absolute w-4 h-4 rounded-full shadow-md top-1/2" 
                      style={{
                        left: fgSliderPos,
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: getHueColor(parseFloat(fgSliderPos) * 3.6),
                        border: '2px solid white'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className={COLOR_VALUE_ROW}>
                <div className="flex shrink-0 items-center">
                  <Tooltip content="Переключить между HEX и RGB">
                    <button 
                      type="button"
                      className="flex items-center h-8 rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-800 hover:bg-gray-200"
                      onClick={() => setFgColorMode(fgColorMode === 'hex' ? 'rgb' : 'hex')}
                      aria-label="Переключить между HEX и RGB форматами цвета"
                    >
                      {fgColorMode.toUpperCase()}
                      <div className="flex flex-col ml-1 -space-y-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-2.5 h-2.5" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-2.5 h-2.5" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </div>
                    </button>
                  </Tooltip>
                </div>
                {fgColorMode === 'hex' ? (
                  <input
                    type="text"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    spellCheck={false}
                    aria-label="Цвет текста, HEX"
                    className={COLOR_FIELD_INPUT}
                  />
                ) : (
                  <RgbTripletInputs
                    hex={textColor}
                    onChannelChange={(ch, val) => handleRgbChannelChange(ch, val, false)}
                  />
                )}
              </div>
            </div>
          ) : (
            <div>
              <div 
                ref={bgColorFieldRef}
                className="rounded-xl h-24 mb-3 relative cursor-pointer"
                onClick={(e) => handleColorFieldClick(e, true)}
                onMouseDown={(e) => {
                  handleColorFieldClick(e, true);
                  setIsDraggingBgField(true);
                }}
                style={{
                  background: `linear-gradient(to right, white, ${getHueColor(parseFloat(bgSliderPos) * 3.6)}), linear-gradient(to bottom, transparent, black)`,
                  backgroundBlendMode: 'multiply'
                }}
              >
                <div className="absolute inset-0 p-3">
                  <div 
                    className="w-full h-full rounded-md relative"
                    style={{
                    
                    }}
                  >
                    <div 
                      className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2"
                      style={{ 
                        backgroundColor: backgroundColor,
                        left: bgColorPos.left, 
                        top: bgColorPos.top 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div 
                ref={bgColorSliderRef}
                className="h-6 rounded-xl mb-3 relative cursor-pointer"
                onClick={(e) => handleColorSliderClick(e, true)}
                onMouseDown={(e) => {
                  handleColorSliderClick(e, true);
                  setIsDraggingBgSlider(true);
                }}
                style={{
                  background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                  boxSizing: 'border-box',
                  padding: '0'
                }}
              >
                <div className="absolute inset-0 px-3">
                  <div 
                    className="w-full h-full rounded-md relative"
                    style={{ 
                    }}
                  >
                    <div 
                      className="absolute w-4 h-4 rounded-full shadow-md top-1/2" 
                      style={{
                        left: bgSliderPos,
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: isGlyphsView
                          ? 'var(--color-gray-400)'
                          : getHueColor(parseFloat(bgSliderPos) * 3.6),
                        border: '2px solid white',
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className={COLOR_VALUE_ROW}>
                <div className="flex shrink-0 items-center">
                  <Tooltip content="Переключить между HEX и RGB форматами цвета">
                    <button 
                      type="button"
                      className="flex items-center rounded-md h-8 bg-gray-50 px-2 py-1 text-xs text-gray-800 hover:bg-gray-200"
                      onClick={() => setBgColorMode(bgColorMode === 'hex' ? 'rgb' : 'hex')}
                      aria-label="Переключить между HEX и RGB форматами цвета"
                    >
                      {bgColorMode.toUpperCase()}
                      <div className="flex flex-col ml-1 -space-y-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-2.5 h-2.5" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-2.5 h-2.5" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </div>
                    </button>
                  </Tooltip>
                </div>
                {bgColorMode === 'hex' ? (
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    spellCheck={false}
                    aria-label="Цвет фона, HEX"
                    className={COLOR_FIELD_INPUT}
                  />
                ) : (
                  <RgbTripletInputs
                    hex={backgroundColor}
                    onChannelChange={(ch, val) => handleRgbChannelChange(ch, val, true)}
                  />
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Быстрые образцы текста и наборы символов */}
        <div className="-mx-4 border-t border-gray-200 px-4 pt-4 pb-4">
          <div className="mb-4 grid grid-cols-2 gap-2">
            {SAMPLE_QUICK_PRESETS.map(({ key, label }) => {
              const active = sidebarTextPreset === `sample:${key}`;
              return (
                <button
                  key={`sample-${key}`}
                  type="button"
                  disabled={isGlyphsView}
                  className={active ? SIDEBAR_PRESET_BTN_ACTIVE : SIDEBAR_PRESET_BTN_IDLE}
                  onClick={() => pickSidebarTextPreset('sample', key)}
                >
                  {label}
                </button>
              );
            })}
            {GLYPH_QUICK_PRESETS.map(({ key, label }) => {
              const active = sidebarTextPreset === `glyph:${key}`;
              return (
                <button
                  key={`glyph-${key}`}
                  type="button"
                  disabled={isGlyphsView}
                  className={active ? SIDEBAR_PRESET_BTN_ACTIVE : SIDEBAR_PRESET_BTN_IDLE}
                  onClick={() => pickSidebarTextPreset('glyph', key)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={EDITOR_SIDEBAR_FOOTER_BAR_CLASS}>
        <ResetButton onResetSelectedFont={resetSelectedFontState} />
      </div>
        </>
      )}
        </div>

        {sidebarOverlayThumb ? (
          <div
            className="pointer-events-none absolute right-0 top-2 bottom-2 z-20 w-2"
            aria-hidden
          >
            <div
              className={`absolute right-1 w-1.5 rounded-full bg-gray-400 transition-opacity duration-200 ${
                sidebarScrollbarVisible ? 'opacity-90' : 'opacity-0'
              }`}
              style={{
                top: `${sidebarOverlayThumb.top}px`,
                height: `${sidebarOverlayThumb.thumbH}px`,
              }}
            />
          </div>
        ) : null}
      </div>
      ) : (
        <div className="flex min-h-0 flex-1" />
      )}

      <div className="relative border-t min-h-[52px] border-gray-200 bg-white p-2" ref={settingsPopoverRef}>
        {isAppSettingsOpen ? (
          <div className="absolute bottom-[calc(100%+8px)] left-2 right-2 z-30 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
            <p className="mb-2 text-xs font-semibold uppercase text-gray-700">Настройки</p>
            <label className="flex items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-2 text-xs font-semibold uppercase text-gray-800">
              <span className="truncate">Темная тема</span>
              <button
                type="button"
                aria-pressed={darkTheme}
                onClick={() => setDarkTheme((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  darkTheme ? 'bg-accent' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
                    darkTheme ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
          </div>
        ) : null}
        <div className={`grid ${isSidebarCollapsed ? 'grid-cols-1 gap-2' : 'grid-cols-2 gap-2 h-full'}`}>
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-md bg-gray-50 text-gray-800 transition-colors hover:text-accent"
            aria-label={isSidebarCollapsed ? 'Развернуть левую панель' : 'Свернуть левую панель'}
            title={isSidebarCollapsed ? 'Развернуть левую панель' : 'Свернуть левую панель'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden>
              {isSidebarCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
              )}
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setIsAppSettingsOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-md bg-gray-50 text-gray-800 transition-colors hover:text-accent"
            aria-label="Настройки приложения"
            title="Настройки приложения"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317a1.724 1.724 0 0 1 3.35 0l.159.81a1.724 1.724 0 0 0 2.573 1.154l.713-.406a1.724 1.724 0 0 1 2.294.633 1.724 1.724 0 0 1-.49 2.265l-.654.495a1.724 1.724 0 0 0 0 2.764l.654.495a1.724 1.724 0 0 1 .49 2.265 1.724 1.724 0 0 1-2.294.633l-.713-.406a1.724 1.724 0 0 0-2.573 1.154l-.159.81a1.724 1.724 0 0 1-3.35 0l-.159-.81a1.724 1.724 0 0 0-2.573-1.154l-.713.406a1.724 1.724 0 0 1-2.294-.633 1.724 1.724 0 0 1 .49-2.265l.654-.495a1.724 1.724 0 0 0 0-2.764l-.654-.495a1.724 1.724 0 0 1-.49-2.265 1.724 1.724 0 0 1 2.294-.633l.713.406a1.724 1.724 0 0 0 2.573-1.154l.159-.81Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
