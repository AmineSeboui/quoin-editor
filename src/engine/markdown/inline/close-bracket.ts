import type { Attrs } from '../../model/types';
import { sanitizeHref } from '../urls';
import { processEmphasis } from './delimiters';
import type { Item } from './inline-items';
import { normalizeLabel, parseInlineLinkTail, parseLinkLabel, type LinkTarget, type Parsed } from './link-syntax';
import { pushText, type Bracket, type Scanner } from './scanner';

const MENTION = 'mention:';

function matchReference(scanner: Scanner, opener: Bracket, after: number): Parsed<LinkTarget> | null {
  if (scanner.refs.size === 0) return null;
  const label = parseLinkLabel(scanner.src, after);
  if (label?.value) {
    const target = scanner.refs.get(normalizeLabel(label.value));
    return target ? { value: target, end: label.end } : null;
  }
  const ownLabel = parseLinkLabel(scanner.src, opener.start - 1);
  if (ownLabel?.end !== after) return null;
  const target = scanner.refs.get(normalizeLabel(ownLabel.value));
  return target ? { value: target, end: label ? label.end : after } : null;
}

function matchLink(scanner: Scanner, opener: Bracket): Parsed<LinkTarget> | null {
  const after = scanner.pos + 1;
  const inline = scanner.src[after] === '(' ? parseInlineLinkTail(scanner.src, after + 1) : null;
  return inline ?? matchReference(scanner, opener, after);
}

function plainText(items: readonly Item[]): string | null {
  let result = '';
  for (const item of items) {
    if (item.kind === 'text' && !item.marks) result += item.text;
    else if (item.kind === 'delimiter' && item.opens.length + item.closes.length === 0) {
      result += item.char.repeat(item.count);
    } else return null;
  }
  return result;
}

function mentionAtom(href: string, label: string | null): Item | null {
  if (!href.startsWith(MENTION) || !label?.startsWith('@')) return null;
  const reference = href.slice(MENTION.length);
  const colon = reference.indexOf(':');
  const id = reference.slice(colon + 1);
  if (!id) return null;
  const attrs: Attrs = { id, label: label.slice(1) };
  return { kind: 'atom', type: 'mention', attrs: colon < 0 ? attrs : { ...attrs, kind: reference.slice(0, colon) } };
}

function formLink(scanner: Scanner, opener: Bracket, target: LinkTarget): void {
  const { items } = scanner;
  const href = sanitizeHref(target.href);
  if (href === null) {
    items[opener.index] = { kind: 'text', text: '' };
    return;
  }
  const mention = mentionAtom(href, plainText(items.slice(opener.index + 1)));
  if (mention) {
    items.length = opener.index;
    items.push(mention);
    return;
  }
  const attrs: Attrs = target.title ? { href, title: target.title } : { href };
  const range = { mark: { type: 'link', attrs } };
  items[opener.index] = { kind: 'open', range };
  items.push({ kind: 'close', range });
}

// Inactive openers always sit below active ones, so the walk can stop at the first inactive opener.
// Image openers are deactivated too, which changes nothing because they never form a link.
function deactivateOpeners(brackets: readonly Bracket[]): void {
  for (let at = brackets.length - 1; at >= 0 && brackets[at].active; at--) brackets[at].active = false;
}

export function closeBracket(scanner: Scanner): void {
  const opener = scanner.brackets.pop();
  const target = opener?.active && !opener.image ? matchLink(scanner, opener) : null;
  if (!opener || !target) {
    pushText(scanner, ']', 1);
    return;
  }
  processEmphasis(scanner.delimiters, opener.bottom);
  formLink(scanner, opener, target.value);
  scanner.pos = target.end;
  deactivateOpeners(scanner.brackets);
}
