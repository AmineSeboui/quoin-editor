import { emit, type Context, type Sink } from './html-context';
import { flatText, isBlockTag, isElement, MAX_DEPTH, tagName, TEXT_NODE } from './html-dom';

const LANGUAGE = /(?:^|\s)(?:language|lang)-(\S+)/;

function preText(node: Node, depth = 0): string {
  if (node.nodeType === TEXT_NODE) return node.nodeValue ?? '';
  if (!isElement(node)) return '';
  if (tagName(node) === 'br') return '\n';
  if (depth > MAX_DEPTH) return flatText(node);
  const text = Array.from(node.childNodes)
    .map((part) => preText(part, depth + 1))
    .join('');
  return depth > 0 && isBlockTag(node) && !text.endsWith('\n') ? `${text}\n` : text;
}

const languageOf = (element: Element | null): string | undefined =>
  element === null ? undefined : LANGUAGE.exec(element.getAttribute('class') ?? '')?.[1];

export function codeBlock(pre: Element, ctx: Context, sink: Sink): void {
  const code = preText(pre).replace(/\r\n?/g, '\n').replace(/\n$/, '');
  const language = languageOf(pre) ?? languageOf(pre.querySelector('code')) ?? '';
  emit(sink, 'CODE', ctx.indent, { language, code }, {});
}
