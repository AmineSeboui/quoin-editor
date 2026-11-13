import { sanitizeHref } from '../../engine';
import { SCHEME } from '../../engine/markdown/urls';

const DOMAIN_START = /^[^/#?.]/;
const EMAIL = /^[^@/]+@([^@/]+)$/;
const WHITESPACE = /\s/;

// Each test reads the address once. A pattern that searches for the dot of the domain tries every dot against the rest
// of the address, which takes time growing with the square of a pasted value's length.
const isEmail = (address: string): boolean => EMAIL.exec(address)?.[1].slice(1, -1).includes('.') === true;
const isBareDomain = (address: string): boolean => DOMAIN_START.test(address) && address.includes('.', 1);

function scheme(address: string): string {
  if (isEmail(address)) return `mailto:${address}`;
  return isBareDomain(address) ? `https://${address}` : address;
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
