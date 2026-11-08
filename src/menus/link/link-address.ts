import { sanitizeHref } from '../../engine';
import { SCHEME } from '../../engine/markdown/urls';

const BARE_DOMAIN = /^[^\s/#?.]\S*\.\S*$/;
const EMAIL = /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/;
const WHITESPACE = /\s/;

function scheme(address: string): string {
  if (EMAIL.test(address)) return `mailto:${address}`;
  return BARE_DOMAIN.test(address) ? `https://${address}` : address;
}

/**
 * The href for an address typed in the link popover, or null when it has whitespace inside it or the engine's link rule
 * refuses it. An address with no scheme that looks like an email address gets `mailto:`, and one that looks like a
 * domain, such as `example.com`, gets `https://`: kept as it is, it would be a path relative to the page. Paths and
 * anchors stay relative.
 */
export function linkAddress(typed: string): string | null {
  const address = typed.trim();
  if (WHITESPACE.test(address)) return null;
  const completed = SCHEME.test(address) ? address : scheme(address);
  const href = sanitizeHref(completed);
  return href || null;
}
