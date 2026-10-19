const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:', 'mention:']);
export const SCHEME = /^([a-z][a-z0-9+.-]*):/i;
const CONTROL = /\p{Cc}/u;

export function sanitizeHref(href: string): string | null {
  const trimmed = href.trim();
  if (CONTROL.test(trimmed)) return null;
  const scheme = SCHEME.exec(trimmed);
  if (!scheme) return trimmed;
  return SAFE_SCHEMES.has(scheme[1].toLowerCase() + ':') ? trimmed : null;
}
