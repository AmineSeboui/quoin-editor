import { str } from '../engine/blocks/data-fields';
import { sanitizeAssetUrl, sanitizeHref } from '../engine/markdown/urls';
import type { EngineBlock } from '../engine/model/types';

export type ResolveAssetUrl = (storageKey: string) => string | null;

/** The address of a block's stored file, when it resolves to one that is safe to fetch. */
export function assetUrl(block: EngineBlock, resolveAssetUrl: ResolveAssetUrl): string | null {
  const key = str(block.attrs.storageKey);
  const src = key === '' ? null : resolveAssetUrl(key);
  return src ? sanitizeAssetUrl(src) : null;
}

/** The address of a picture, as toHTML reads it: its own address when it has one, else its stored file's. */
export function pictureUrl(block: EngineBlock, resolveAssetUrl: ResolveAssetUrl): string | null {
  const url = str(block.attrs.url);
  return url === '' ? assetUrl(block, resolveAssetUrl) : sanitizeHref(url);
}
