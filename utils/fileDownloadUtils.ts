export function saveBlobAsFile(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

export function uniqueDownloadFileName(preferredName: string, usedNames: Set<string>): string {
  const safeName = String(preferredName || 'download.bin');
  if (!usedNames.has(safeName)) {
    usedNames.add(safeName);
    return safeName;
  }

  const dotIndex = safeName.lastIndexOf('.');
  const hasExtension = dotIndex > 0;
  const stem = hasExtension ? safeName.slice(0, dotIndex) : safeName;
  const ext = hasExtension ? safeName.slice(dotIndex) : '';
  let suffix = 2;
  let candidate = `${stem}-${suffix}${ext}`;
  while (usedNames.has(candidate)) {
    suffix += 1;
    candidate = `${stem}-${suffix}${ext}`;
  }
  usedNames.add(candidate);
  return candidate;
}

export function buildSafeFileBase(name: unknown, fallback = 'font'): string {
  return (
    String(name || fallback)
      .trim()
      .replace(/[^\p{L}\p{N}\-_.\s]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || fallback
  );
}
