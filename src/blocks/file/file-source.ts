import type { BlockAttrs } from '../../engine';
import { str } from '../str';
import { resolvedAsset } from '../upload/resolved-asset';

const SCRIPT = /^(javascript|vbscript):/i;

/** The name of the file a file block holds, or its key when the upload kept no name. */
export const fileName = (attrs: BlockAttrs): string => str(attrs.filename) || str(attrs.storageKey);

/** Whether a file block holds a file, which it draws as a card rather than as an upload button. */
export const hasFile = (attrs: BlockAttrs): boolean => fileName(attrs) !== '';

/** Where the file of a file block downloads from: the host's address for its key, unless that address runs a script. */
export function fileHref(attrs: BlockAttrs, resolveAssetUrl: (storageKey: string) => string): string | null {
  const key = str(attrs.storageKey);
  const src = key === '' ? null : resolvedAsset(resolveAssetUrl, key);
  // Browsers drop the tabs, line breaks and control characters in an address, which would otherwise hide its scheme.
  return src === null || SCRIPT.test(src.replace(/[\s\p{Cc}]/gu, '')) ? null : src;
}
