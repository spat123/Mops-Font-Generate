/** @typedef {'RU' | 'EN'} BillingLocale */

/** @type {Record<BillingLocale, Record<string, string>>} */
export const billingCopy = {
  RU: {
    dialogTitle: 'Тарифы',
    menuButton: 'Тарифы',
    showPlans: 'Показать тарифы',
    upgradeHint: 'Улучшите тариф, чтобы получить больше возможностей.',
    upgradeHintReceive: 'Улучшите тариф, чтобы получать больше возможностей.',
    upgradeCtaSoon: 'Улучшить тариф (скоро)',
    librariesLimitToast: 'Лимит библиотек достигнут. Посмотрите тарифы, чтобы получить больше возможностей.',
    generationLimitToast: 'Вы исчерпали лимит генераций в этом месяце. Посмотрите тариф Pro.',
    tooltipOpenPlans: 'Лимит библиотек достигнут — открыть тарифы',
    ariaUpgradePlan: 'Лимит библиотек достигнут. Улучшить тариф',
    badgeTitle: 'Тариф',
  },
  EN: {
    dialogTitle: 'Plans',
    menuButton: 'Plans',
    showPlans: 'Show plans',
    upgradeHint: 'Upgrade your plan to unlock more features.',
    upgradeHintReceive: 'Upgrade your plan to get more capabilities.',
    upgradeCtaSoon: 'Upgrade plan (coming soon)',
    librariesLimitToast: 'Library limit reached. View plans for more capacity.',
    generationLimitToast: 'You have used all generations this month. See Pro plans.',
    tooltipOpenPlans: 'Library limit reached — open plans',
    ariaUpgradePlan: 'Library limit reached. Upgrade plan',
    badgeTitle: 'Plan',
  },
};

/** @param {BillingLocale | string} [locale] */
export function getBillingCopy(locale = 'RU') {
  const key = String(locale).toUpperCase() === 'EN' ? 'EN' : 'RU';
  return billingCopy[key];
}
