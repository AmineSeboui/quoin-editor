/** The host's address for a stored key, or null when its resolver throws or gives no address. */
export function resolvedAsset(resolveAssetUrl: (storageKey: string) => string, storageKey: string): string | null {
  try {
    const src = resolveAssetUrl(storageKey);
    return typeof src === 'string' && src !== '' ? src : null;
  } catch {
    return null;
  }
}
