import { autolinkHref } from '../markdown/autolink-href';
import { trimUrlEnd } from '../markdown/trim-url-end';

const HTTP_URL = /^(?:https?:\/\/\S|www\.[^\s.])\S*$/i;
const LINKABLE_URL = /^(?:https?:\/\/\S|mailto:\S|www\.[^\s.])\S*$/i;

export function loneUrl(text: string, schemes: 'http' | 'linkable' = 'http'): string | null {
  const url = text.trim();
  return (schemes === 'http' ? HTTP_URL : LINKABLE_URL).test(url) ? url : null;
}

export type PastedLink = { readonly url: string; readonly href: string; readonly rest: string };

export function pastedLink(text: string, schemes: 'http' | 'linkable' = 'http'): PastedLink | null {
  const token = loneUrl(text, schemes);
  if (token === null) return null;
  const url = trimUrlEnd(token);
  const href = loneUrl(url, schemes) === null ? null : autolinkHref(url);
  return href === null ? null : { url, href, rest: token.slice(url.length) };
}
