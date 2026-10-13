import { sanitizeHref } from './urls';

export function autolinkHref(url: string): string | null {
  return sanitizeHref(/^www\./i.test(url) ? `https://${url}` : url);
}
