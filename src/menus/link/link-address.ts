import { sanitizeHref } from '../../engine';
import { SCHEME } from '../../engine/markdown/urls';

const BARE_DOMAIN = /^[^\s/#?.]\S*\.\S*$/;

/**
 * The href for an address typed in the link popover, or null when the engine's link rule refuses it. An address with
 * no scheme that looks like a domain, such as `example.com`, gets `https://`: kept as it is, it would be a path
 * relative to the page. Paths and anchors stay relative.
 */
export function linkAddress(typed: string): string | null {
  const address = typed.trim();
  const completed = !SCHEME.test(address) && BARE_DOMAIN.test(address) ? `https://${address}` : address;
  const href = sanitizeHref(completed);
  return href === '' ? null : href;
}
