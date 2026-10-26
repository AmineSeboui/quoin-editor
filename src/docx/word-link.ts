import { sanitizeHref } from '../engine/markdown/urls';

// A browser resolves a relative address against the page, but Word reads one against the file's own folder, and reads
// \\host\share or //host/x as a network share it opens over SMB, so only absolute addresses of these schemes link, a
// web address only with a host.
const LINKED = /^(?:https?:\/\/[^/\\]|mailto:|tel:)/i;
const SCHEME = /^[a-z][\w+.-]*:/i;

function resolved(href: string, baseUrl: string | undefined): string {
  if (baseUrl === undefined || SCHEME.test(href)) return href;
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return href;
  }
}

/** The target an exported link points at, read against `baseUrl` when relative, or null when its text is written unlinked. */
export function wordLink(href: string, baseUrl?: string): string | null {
  const safe = sanitizeHref(href);
  const target = safe === null ? null : resolved(safe, baseUrl);
  return target !== null && LINKED.test(target) ? target : null;
}
