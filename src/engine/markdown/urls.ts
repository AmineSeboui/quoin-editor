const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:', 'mention:']);
const ASSET_SCHEMES = new Set(['http:', 'https:', 'blob:', 'data:']);
export const SCHEME = /^([a-z][a-z0-9+.-]*):/i;
const CONTROL = /\p{Cc}/u;

function allowed(href: string, schemes: ReadonlySet<string>): string | null {
  const trimmed = href.trim();
  if (CONTROL.test(trimmed)) return null;
  const scheme = SCHEME.exec(trimmed);
  if (!scheme) return trimmed;
  return schemes.has(scheme[1].toLowerCase() + ':') ? trimmed : null;
}

export function sanitizeHref(href: string): string | null {
  return allowed(href, SAFE_SCHEMES);
}

/** An address a stored file is fetched from: an http, https, blob, data or relative address, else null. */
export function sanitizeAssetUrl(href: string): string | null {
  return allowed(href, ASSET_SCHEMES);
}
