import { FREE_STATIC_GENERATIONS_LIMIT } from './freeStaticGenerationQuota';
import {
  MAX_SAVED_LIBRARIES_PER_ACCOUNT,
  MAX_SAVED_LIBRARIES_PRO_ACCOUNT,
} from './authLibraryLimits';
import { MAX_SHARE_FONTS_FREE } from './libraryShareLimits';

export type BillingPeriod = 'monthly' | 'annual';
export type BillingLocale = 'RU' | 'EN';

export const PRO_MONTHLY_RUB = 390;
export const PRO_ANNUAL_RUB = 3510;
export const PRO_ANNUAL_DISCOUNT_PERCENT = 25;

export function getProMonthlyEquivalentRub(period: BillingPeriod): number {
  if (period === 'annual') {
    return Math.round(PRO_ANNUAL_RUB / 12);
  }
  return PRO_MONTHLY_RUB;
}

export function formatRub(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getBillingPeriodOptions(locale: BillingLocale | string = 'RU') {
  const en = String(locale).toUpperCase() === 'EN';
  return [
    { value: 'monthly' as const, label: en ? 'Monthly' : 'Месяц', title: en ? 'Monthly billing' : 'Оплата помесячно' },
    { value: 'annual' as const, label: en ? 'Annual' : 'Год', title: en ? 'Annual billing' : 'Оплата за год' },
  ];
}

export function getAnnualSavingsLabel(locale: BillingLocale | string = 'RU'): string {
  const en = String(locale).toUpperCase() === 'EN';
  return en
    ? `Save ${PRO_ANNUAL_DISCOUNT_PERCENT}% with annual billing`
    : `Экономия ${PRO_ANNUAL_DISCOUNT_PERCENT}% при оплате за год`;
}

export function getProPriceDisplay(locale: BillingLocale | string = 'RU', period: BillingPeriod) {
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
    sub: null as string | null,
  };
}

export function getFreePlanFeatures(locale: BillingLocale | string = 'RU'): string[] {
  const en = String(locale).toUpperCase() === 'EN';
  if (en) {
    return [
      `Up to ${MAX_SAVED_LIBRARIES_PER_ACCOUNT} font libraries`,
      'Google Fonts, Fontsource, and local uploads',
      'Preview modes: Plain, Waterfall, Glyphs, Styles',
      'Waterfall: preset scale ratios (custom scale — Pro)',
      'CSS export with @font-face (.css / .txt)',
      `${FREE_STATIC_GENERATIONS_LIMIT} variable→static exports per month`,
      `Share links (up to ${MAX_SHARE_FONTS_FREE} fonts per link) and ZIP download`,
    ];
  }
  return [
    `До ${MAX_SAVED_LIBRARIES_PER_ACCOUNT} библиотек`,
    'Google Fonts, Fontsource и локальные файлы',
    'Режимы превью: Plain, Waterfall, Glyphs, Styles',
    'Waterfall: готовые шкалы (своё значение — Pro)',
    'Экспорт CSS с @font-face (.css / .txt)',
    `${FREE_STATIC_GENERATIONS_LIMIT} генераций VF → статик в месяц`,
    `Ссылки «Поделиться» (до ${MAX_SHARE_FONTS_FREE} шрифтов в ссылке) и архив`,
  ];
}

export function getProPlanFeatures(locale: BillingLocale | string = 'RU'): string[] {
  const en = String(locale).toUpperCase() === 'EN';
  if (en) {
    return [
      `Up to ${MAX_SAVED_LIBRARIES_PRO_ACCOUNT} libraries (Free: ${MAX_SAVED_LIBRARIES_PER_ACCOUNT})`,
      'Unlimited variable→static exports',
      'Waterfall: custom scale ratio (any value 1.001–3)',
      'Your own font name and style when exporting static files from VF',
      'Priority updates and early access to new features',
      'Unlimited fonts per «Share» link',
    ];
  }
  return [
    `До ${MAX_SAVED_LIBRARIES_PRO_ACCOUNT} библиотек (на Free — ${MAX_SAVED_LIBRARIES_PER_ACCOUNT})`,
    'Без лимита генераций VF → статик',
    'Waterfall: своё значение шкалы (коэффициент 1.001–3)',
    'Своё имя и стиль шрифта при экспорте статики из VF',
    'Приоритетные обновления и ранний доступ к новым фичам',
    'Неограниченное число шрифтов в ссылке «Поделиться»',
  ];
}

export function getFreePriceDisplay(locale: BillingLocale | string = 'RU') {
  const en = String(locale).toUpperCase() === 'EN';
  return {
    main: en ? 'Free' : '0 ₽',
    suffix: en ? '' : '/ мес',
    sub: null as string | null,
  };
}
