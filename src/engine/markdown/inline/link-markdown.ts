import type { Mark } from '../../model/types';
import { escapeEntityAmpersands } from './escape-text';
import { parseAutolink, parseLinkDestination } from './link-syntax';

function escapeFor(value: string, characters: RegExp, escapePipes: boolean): string {
  const escaped = value.replace(characters, '\\$&');
  const piped = escapePipes ? escaped.replace(/\|/g, '\\|') : escaped;
  return escapeEntityAmpersands(piped).replace(/\n/g, '&#10;');
}

function readsBackAs(destination: string, href: string): boolean {
  const parsed = parseLinkDestination(`${destination})`, 0);
  return parsed?.value === href && parsed.end === destination.length;
}

export function linkDestination(href: string, escapePipes: boolean): string {
  const raw = escapeFor(href, /\\/g, escapePipes);
  return readsBackAs(raw, href) ? raw : `<${escapeFor(href, /[\\<>]/g, escapePipes)}>`;
}

export function linkClose(mark: Mark, escapePipes: boolean): string {
  const href = mark.attrs?.href ?? '';
  const title = mark.attrs?.title;
  if (!title) return `](${linkDestination(href, escapePipes)})`;
  const destination = href === '' ? '<>' : linkDestination(href, escapePipes);
  return `](${destination} "${escapeFor(title, /[\\"]/g, escapePipes)}")`;
}

export function autolinkMarkdown(text: string, mark: Mark): string | null {
  if (mark.attrs?.title) return null;
  const candidate = `<${text}>`;
  const parsed = parseAutolink(candidate, 0);
  if (parsed?.end !== candidate.length) return null;
  return parsed.value.text === text && parsed.value.href === mark.attrs?.href ? candidate : null;
}
