import { sanitizeHref, type BlockAttrs } from '../../engine';
import { str } from '../../engine/blocks/data-fields';
import { assetHref } from '../upload/resolved-asset';

/** The key of the uploaded picture or the address of a linked one, whichever the block has. */
export const hasPicture = (attrs: BlockAttrs): boolean => str(attrs.url) !== '' || str(attrs.storageKey) !== '';

/** Where the picture of an image block loads from: its link when it has one, else the host's address for its key. */
export function imageSource(attrs: BlockAttrs, resolveAssetUrl: (storageKey: string) => string): string | null {
  const url = str(attrs.url);
  return url === '' ? assetHref(resolveAssetUrl, str(attrs.storageKey)) : sanitizeHref(url);
}
