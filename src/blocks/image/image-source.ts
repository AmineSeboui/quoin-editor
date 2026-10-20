import { sanitizeHref, type BlockAttrs } from '../../engine';
import { str } from '../str';

/** The key of the uploaded picture or the address of a linked one, whichever the block has. */
export const hasPicture = (attrs: BlockAttrs): boolean => str(attrs.url) !== '' || str(attrs.storageKey) !== '';

/** The host's address for a stored key, or null when its resolver throws or gives no address. */
export function resolvedAsset(resolveAssetUrl: (storageKey: string) => string, storageKey: string): string | null {
  try {
    const src = resolveAssetUrl(storageKey);
    return typeof src === 'string' && src !== '' ? src : null;
  } catch {
    return null;
  }
}

/** Where the picture of an image block loads from: its link when it has one, else the host's address for its key. */
export function imageSource(attrs: BlockAttrs, resolveAssetUrl: (storageKey: string) => string): string | null {
  const url = str(attrs.url);
  if (url !== '') return sanitizeHref(url);
  const key = str(attrs.storageKey);
  return key === '' ? null : resolvedAsset(resolveAssetUrl, key);
}
