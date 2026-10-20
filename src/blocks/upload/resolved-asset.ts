import { sanitizeAssetUrl } from '../../engine/markdown/urls';

/**
 * The address a picture or a link takes for a stored key: the host's, unless the key is empty, or its resolver throws
 * or gives no http, https, blob, data or relative address.
 */
export function assetHref(resolveAssetUrl: (storageKey: string) => string, storageKey: string): string | null {
  if (storageKey === '') return null;
  try {
    const src = resolveAssetUrl(storageKey);
    return (typeof src === 'string' && sanitizeAssetUrl(src)) || null;
  } catch {
    return null;
  }
}
