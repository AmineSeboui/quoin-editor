import { sanitizeHref } from '../engine/markdown/urls';

// A browser resolves a relative address against the page, but Word reads one against the file's own folder, and reads
// \\host\share or //host/x as a network share it opens over SMB, so only absolute addresses of these schemes link, a
// web address only with a host.
const LINKED = /^(?:https?:\/\/[^/\\]|mailto:|tel:)/i;

/** The target an exported link points at, or null when its text is written unlinked. */
export function wordLink(href: string): string | null {
  const safe = sanitizeHref(href);
  return safe !== null && LINKED.test(safe) ? safe : null;
}
