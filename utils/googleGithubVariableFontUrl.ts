/**
 * Полный variable TTF в репозитории google/fonts (имя файла с осями в скобках).
 * Веб-woff2 с gstatic — урезанный fvar (часто только wght); для рабочих осей нужен этот файл.
 */

const RAW_BASE = 'https://raw.githubusercontent.com/google/fonts/main';

/** "Roboto Flex" → "RobotoFlex" */
export function familyNameToCamelCase(family: string): string {
  return String(family || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join('');
}

/**
 * @param family — как в metadata (напр. "Roboto Flex")
 * @param axisTags — порядок тегов как в metadata / slimAxes
 */
export function buildGithubVariableTtfCandidateUrls(
  family: string,
  axisTags: string[],
  options: { italic?: boolean } = {},
): string[] {
  const camel = familyNameToCamelCase(family);
  if (!camel || !axisTags?.length) return [];
  const slug = camel.toLowerCase();
  const inner = axisTags.join(',');
  const suffix = options?.italic ? '-Italic' : '';
  const filename = `${camel}${suffix}[${inner}].ttf`;
  const enc = encodeURIComponent(filename);
  const prefixes = ['ofl', 'apache', 'ufl'];
  return prefixes.map((p) => `${RAW_BASE}/${p}/${slug}/${enc}`);
}
