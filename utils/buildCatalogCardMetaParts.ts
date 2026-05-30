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

export type CatalogCardMetaSplit = {
  left: string[];
  right: string[];
};

/** Левая колонка: категория / vf / italic; правая: языки / начертания / trial (как в каталоге). */
export function buildCatalogCardMetaSplit({
  category,
  subsets,
  isVariable = false,
  hasItalic = false,
  styleCount = 0,
  includeTrial = false,
}: BuildCatalogCardMetaPartsInput): CatalogCardMetaSplit {
  const categoryLabel = getFontCategoryLabelRu(category) || null;
  const languageCount = Array.isArray(subsets) ? subsets.filter(Boolean).length : 0;
  const styleCountNum = Number(styleCount) || 0;
  const hasStyleCount = styleCountNum > 0;

  const left = [categoryLabel, isVariable ? 'vf' : null, hasItalic ? 'italic' : null].filter(
    (part): part is string => Boolean(part),
  );
  const right = [
    languageCount > 0
      ? `${languageCount} ${pluralRu(languageCount, 'язык', 'языка', 'языков')}`
      : null,
    hasStyleCount
      ? `${styleCountNum} ${pluralRu(styleCountNum, 'начертание', 'начертания', 'начертаний')}`
      : null,
    includeTrial ? 'trial' : null,
  ].filter((part): part is string => Boolean(part));

  return { left, right };
}

/** Строки метаданных для карточки каталога / библиотеки (как в UnifiedCatalogCard). */
export function buildCatalogCardMetaParts(input: BuildCatalogCardMetaPartsInput): string[] {
  const { left, right } = buildCatalogCardMetaSplit(input);
  return [...left, ...right];
}
