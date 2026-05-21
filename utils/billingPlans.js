import { FREE_STATIC_GENERATIONS_LIMIT } from './freeStaticGenerationQuota';
import {
  MAX_SAVED_LIBRARIES_PER_ACCOUNT,
  MAX_SAVED_LIBRARIES_PRO_ACCOUNT,
} from './authLibraryLimits';

/** @typedef {'monthly' | 'annual'} BillingPeriod */
/** @typedef {'RU' | 'EN'} BillingLocale */

/** Цены Pro в рублях (ориентир для РФ, закрытая бета). */
export const PRO_MONTHLY_RUB = 390;
export const PRO_ANNUAL_RUB = 3510;
export const PRO_ANNUAL_DISCOUNT_PERCENT = 25;

/** @param {BillingPeriod} period */
export function getProMonthlyEquivalentRub(period) {
  if (period === 'annual') {
    return Math.round(PRO_ANNUAL_RUB / 12);
  }
  return PRO_MONTHLY_RUB;
}

/** @param {number} amount */
export function formatRub(amount) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** @param {BillingLocale | string} [locale] */
export function getBillingPeriodOptions(locale = 'RU') {
  const en = String(locale).toUpperCase() === 'EN';
  return [
    { value: 'monthly', label: en ? 'Monthly' : 'Месяц', title: en ? 'Monthly billing' : 'Оплата помесячно' },
    { value: 'annual', label: en ? 'Annual' : 'Год', title: en ? 'Annual billing' : 'Оплата за год' },
  ];
}

/** @param {BillingLocale | string} [locale] */
export function getAnnualSavingsLabel(locale = 'RU') {
  const en = String(locale).toUpperCase() === 'EN';
  return en
    ? `Save ${PRO_ANNUAL_DISCOUNT_PERCENT}% with annual billing`
    : `Экономия ${PRO_ANNUAL_DISCOUNT_PERCENT}% при оплате за год`;
}

/** @param {BillingLocale | string} [locale] @param {BillingPeriod} period */
export function getProPriceDisplay(locale = 'RU', period) {
  const en = String(locale).toUpperCase() === 'EN';
  const monthlyEq = getProMonthlyEquivalentRub(period);
  if (period === 'annual') {
    return {
      main: formatRub(monthlyEq),
      suffix: en ? '/ mo' : '/ мес',
      sub: en
        ? `${formatRub(PRO_ANNUAL_RUB)} billed annually`
        : `при оплате ${formatRub(PRO_ANNUAL_RUB)} в год`,
    };
  }
  return {
    main: formatRub(PRO_MONTHLY_RUB),
    suffix: en ? '/ mo' : '/ мес',
    sub: null,
  };
}

/** @param {BillingLocale | string} [locale] */
export function getFreePlanFeatures(locale = 'RU') {
  const en = String(locale).toUpperCase() === 'EN';
  if (en) {
    return [
      `Up to ${MAX_SAVED_LIBRARIES_PER_ACCOUNT} font libraries`,
      'Google Fonts, Fontsource, and local uploads',
      'Preview modes: Plain, Waterfall, Glyphs, Styles',
      'CSS export with @font-face (.css / .txt)',
      `${FREE_STATIC_GENERATIONS_LIMIT} variable→static exports per month`,
      'Share library links and ZIP download',
    ];
  }
  return [
    `До ${MAX_SAVED_LIBRARIES_PER_ACCOUNT} библиотек`,
    'Google Fonts, Fontsource и локальные файлы',
    'Режимы превью: Plain, Waterfall, Glyphs, Styles',
    'Экспорт CSS с @font-face (.css / .txt)',
    `${FREE_STATIC_GENERATIONS_LIMIT} генераций VF → статик в месяц`,
    'Ссылки «Поделиться» и скачивание архивом',
  ];
}

/** @param {BillingLocale | string} [locale] */
export function getProPlanFeatures(locale = 'RU') {
  const en = String(locale).toUpperCase() === 'EN';
  if (en) {
    return [
      `Up to ${MAX_SAVED_LIBRARIES_PRO_ACCOUNT} libraries (Free: ${MAX_SAVED_LIBRARIES_PER_ACCOUNT})`,
      'Unlimited variable→static exports',
      'Your own font name and style when exporting static files from VF',
      'Priority updates and early access to new features',
    ];
  }
  return [
    `До ${MAX_SAVED_LIBRARIES_PRO_ACCOUNT} библиотек (на Free — ${MAX_SAVED_LIBRARIES_PER_ACCOUNT})`,
    'Без лимита генераций VF → статик',
    'Своё имя и стиль шрифта при экспорте статики из VF',
    'Приоритетные обновления и ранний доступ к новым фичам',
  ];
}

/** @param {BillingLocale | string} [locale] */
export function getFreePriceDisplay(locale = 'RU') {
  const en = String(locale).toUpperCase() === 'EN';
  return {
    main: en ? 'Free' : '0 ₽',
    suffix: en ? '' : '/ мес',
    sub: null,
  };
}
