/**
 * Дедупликация асинхронной загрузки preview font-family по slug.
 */
export function createPreviewFamilyLoader() {
  const loadedFamilyBySlug = new Map<string, string>();
  const loadingBySlug = new Map<string, Promise<string | null>>();

  function getPreviewFamily(slug: string | null | undefined): string | null {
    if (!slug) return null;
    return loadedFamilyBySlug.get(slug) || null;
  }

  function hasPreviewFamily(slug: string | null | undefined): boolean {
    if (!slug) return false;
    return loadedFamilyBySlug.has(slug);
  }

  async function loadPreviewFamily(
    slug: string | null | undefined,
    loadImpl: () => Promise<string | null>,
  ): Promise<string | null> {
    if (!slug) return null;
    if (loadedFamilyBySlug.has(slug)) return loadedFamilyBySlug.get(slug) ?? null;
    if (loadingBySlug.has(slug)) return loadingBySlug.get(slug) ?? null;

    const promise = (async () => {
      const family = await loadImpl();
      if (family != null) loadedFamilyBySlug.set(slug, family);
      return family;
    })();

    loadingBySlug.set(slug, promise);
    try {
      return await promise;
    } finally {
      loadingBySlug.delete(slug);
    }
  }

  function reset(): void {
    loadedFamilyBySlug.clear();
    loadingBySlug.clear();
  }

  return { getPreviewFamily, hasPreviewFamily, loadPreviewFamily, reset };
}
