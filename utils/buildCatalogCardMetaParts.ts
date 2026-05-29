import { getFontCategoryLabelRu } from './fontCategoryLabels';
import { pluralRu } from './pluralRu';

export type BuildCatalogCardMetaPartsInput = {
  category?: unknown;
  subsets?: unknown[];
  isVariable?: boolean;
  hasItalic?: boolean;
  styleCount?: number;
  includeTrial?: boolean;
};

/** Строки метаданных для карточки каталога / библиотеки (как в UnifiedCatalogCard). */
export function buildCatalogCardMetaParts({
  category,
  subsets,
  isVariable = false,
  hasItalic = false,
  styleCount = 0,
  includeTrial = false,
}: BuildCatalogCardMetaPartsInput): string[] {
  const categoryLabel = getFontCategoryLabelRu(category) || null;
  const languageCount = Array.isArray(subsets) ? subsets.filter(Boolean).length : 0;
  const styleCountNum = Number(styleCount) || 0;
  const hasStyleCount = styleCountNum > 0;

  return [
    categoryLabel,
    isVariable ? 'vf' : null,
    hasItalic ? 'italic' : null,
    languageCount > 0
      ? `${languageCount} ${pluralRu(languageCount, 'язык', 'языка', 'языков')}`
      : null,
    hasStyleCount
      ? `${styleCountNum} ${pluralRu(styleCountNum, 'начертание', 'начертания', 'начертаний')}`
      : null,
    includeTrial ? 'trial' : null,
  ].filter((part): part is string => Boolean(part));
}
