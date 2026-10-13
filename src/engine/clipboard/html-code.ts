import { emit, type Context, type Sink } from './html-context';
import { flatText, isElement, MAX_DEPTH, tagName, TEXT_NODE } from './html-dom';

const LANGUAGE = /(?:^|\s)(?:language|lang)-(\S+)/;

function preText(node: Node, depth = 0): string {
  if (node.nodeType === TEXT_NODE) return node.nodeValue ?? '';
  if (!isElement(node)) return '';
  if (tagName(node) === 'br') return '\n';
  if (depth > MAX_DEPTH) return flatText(node);
  return Array.from(node.childNodes)
    .map((part) => preText(part, depth + 1))
    .join('');
}

const languageOf = (element: Element | null): string | undefined =>
  element === null ? undefined : LANGUAGE.exec(element.getAttribute('class') ?? '')?.[1];

export function codeBlock(pre: Element, ctx: Context, sink: Sink): void {
  const code = preText(pre).replace(/\r\n?/g, '\n').replace(/\n$/, '');
  const language = languageOf(pre) ?? languageOf(pre.querySelector('code')) ?? '';
  emit(sink, 'CODE', ctx.indent, { language, code }, {});
}
