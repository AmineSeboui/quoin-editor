import {
  normalizeLabel,
  parseLinkDestination,
  parseLinkLabel,
  parseLinkTitle,
  type LinkTarget,
} from '../inline/link-syntax';

type Definition = { label: string; target: LinkTarget; end: number };

function skipSpaces(src: string, pos: number): number {
  let at = pos;
  while (src[at] === ' ' || src[at] === '\t') at++;
  return at;
}

function skipSpacesAndOneNewline(src: string, pos: number): number {
  const at = skipSpaces(src, pos);
  return src[at] === '\n' ? skipSpaces(src, at + 1) : at;
}

function endOfLine(src: string, pos: number): number {
  const at = skipSpaces(src, pos);
  if (at >= src.length) return src.length;
  return src[at] === '\n' ? at + 1 : -1;
}

function parseDefinition(src: string): Definition | null {
  const label = parseLinkLabel(src, 0);
  if (!label || label.value.trim() === '' || src[label.end] !== ':') return null;
  const destination = parseLinkDestination(src, skipSpacesAndOneNewline(src, label.end + 1));
  if (!destination) return null;
  const titleAt = skipSpacesAndOneNewline(src, destination.end);
  const title = titleAt > destination.end ? parseLinkTitle(src, titleAt) : null;
  const titleEnd = title ? endOfLine(src, title.end) : -1;
  if (title && titleEnd >= 0) {
    const target = title.value ? { href: destination.value, title: title.value } : { href: destination.value };
    return { label: label.value, target, end: titleEnd };
  }
  const end = endOfLine(src, destination.end);
  return end < 0 ? null : { label: label.value, target: { href: destination.value }, end };
}

// A definition can only open a paragraph, so each call strips definitions off the front of its lines.
// Definitions are keyed by normalized label and the first definition of a label wins.
export function takeReferenceDefinitions(lines: string[], refs: Map<string, LinkTarget>): string[] {
  if (!lines[0]?.startsWith('[')) return lines;
  let text = lines.join('\n');
  while (text.startsWith('[')) {
    const definition = parseDefinition(text);
    if (!definition) break;
    const key = normalizeLabel(definition.label);
    if (!refs.has(key)) refs.set(key, definition.target);
    text = text.slice(definition.end);
  }
  return text === '' ? [] : text.split('\n');
}
