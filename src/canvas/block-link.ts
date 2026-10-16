const FRAGMENT = '#block-';

/** A link to the block on the current page, read when the link is made so it follows client-side navigation. */
export function defaultBlockLink(blockId: string): string {
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}${FRAGMENT}${encodeURIComponent(blockId)}`;
}

/** The block a `#block-<id>` fragment names, or null for any other fragment. */
export function linkedBlockId(hash: string): string | null {
  if (!hash.startsWith(FRAGMENT) || hash.length === FRAGMENT.length) return null;
  try {
    return decodeURIComponent(hash.slice(FRAGMENT.length));
  } catch {
    return null;
  }
}
