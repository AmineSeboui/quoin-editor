import { sanitizeHref } from '../../engine';

const WEB = /^https?:\/\/[^/?#\s]/i;

/** The address when it is an absolute http or https one the engine's link rule keeps, else null. */
export function webAddress(value: unknown): string | null {
  const href = typeof value === 'string' ? sanitizeHref(value) : null;
  return href !== null && WEB.test(href) ? href : null;
}

/** The host name of a web address, without its `www.`, or null for any other address. */
export function domainOf(value: string): string | null {
  const href = webAddress(value);
  if (href === null) return null;
  try {
    return new URL(href).hostname.replace(/^www\./i, '');
  } catch {
    return null;
  }
}
