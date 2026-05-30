/** Разделы базы знаний (/help?tab=…). */
export const KNOWLEDGE_BASE_TABS = ['overview', 'guides', 'licenses', 'news', 'updates'] as const;

export type KnowledgeBaseTab = (typeof KNOWLEDGE_BASE_TABS)[number];

export type KnowledgeBaseNavItem = {
  id: KnowledgeBaseTab;
  label: string;
  description: string;
};

export const KNOWLEDGE_BASE_NAV: KnowledgeBaseNavItem[] = [
  {
    id: 'overview',
    label: 'Обзор',
    description: 'Что есть в базе знаний и с чего начать',
  },
  {
    id: 'guides',
    label: 'Руководства',
    description: 'Как пользоваться редактором и каталогами',
  },
  {
    id: 'licenses',
    label: 'Лицензии',
    description: 'Справочник лицензий шрифтов в каталоге',
  },
  {
    id: 'news',
    label: 'Новости',
    description: 'Анонсы и события DINAMIC FONT',
  },
  {
    id: 'updates',
    label: 'Обновления',
    description: 'История изменений редактора',
  },
];

export function parseKnowledgeBaseTab(raw: unknown): KnowledgeBaseTab {
  const value = String(raw || '').trim();
  if ((KNOWLEDGE_BASE_TABS as readonly string[]).includes(value)) {
    return value as KnowledgeBaseTab;
  }
  return 'overview';
}

export function knowledgeBaseTabMeta(tab: KnowledgeBaseTab): KnowledgeBaseNavItem {
  return KNOWLEDGE_BASE_NAV.find((item) => item.id === tab) ?? KNOWLEDGE_BASE_NAV[0];
}
