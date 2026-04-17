/**
 * Полный variable TTF в репозитории google/fonts (имя файла с осями в скобках).
 * Веб-woff2 с gstatic — урезанный fvar (часто только wght); для рабочих осей нужен этот файл.
 */

const RAW_BASE = 'https://raw.githubusercontent.com/google/fonts/main';

/** "Roboto Flex" → "RobotoFlex" */
export function familyNameToCamelCase(family) {
  return String(family || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join('');
}

/**
 * @param {string} family — как в metadata (напр. "Roboto Flex")
 * @param {string[]} axisTags — порядок тегов как в metadata / slimAxes
 * @returns {string[]} URL кандидаты (ofl / apache / ufl)
 */
export function buildGithubVariableTtfCandidateUrls(family, axisTags) {
  const camel = familyNameToCamelCase(family);
  if (!camel || !axisTags?.length) return [];
  const slug = camel.toLowerCase();
  const inner = axisTags.join(',');
  const filename = `${camel}[${inner}].ttf`;
  const enc = encodeURIComponent(filename);
  const prefixes = ['ofl', 'apache', 'ufl'];
  return prefixes.map((p) => `${RAW_BASE}/${p}/${slug}/${enc}`);
}
