import { inlineText } from '../model/inline';
import type { EngineBlock } from '../model/types';
import { emit, type Context, type Sink } from './html-context';
import { flatText, isBlockTag, isElement, MAX_DEPTH, tagName, TEXT_NODE } from './html-dom';
import { inlineFromNodes } from './html-inline';

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
  element ? LANGUAGE.exec(element.getAttribute('class') ?? '')?.[1] : undefined;

export function codeBlock(pre: Element, ctx: Context, sink: Sink): void {
  const code = preText(pre).replace(/\r\n?/g, '\n').replace(/\n$/, '');
  const language = languageOf(pre) ?? languageOf(pre.querySelector('code')) ?? '';
  emit(sink, 'CODE', ctx.indent, { language, code }, {});
}

const codeLines = new WeakSet<EngineBlock>();

/**
 * One paragraph of a monospaced paragraph style, which is how a word processor writes code: a line each, its spaces as
 * no-break spaces and its own line breaks as breaks. The lines of one stretch of code join into one code block.
 */
export function codeLine(paragraph: Element, ctx: Context, sink: Sink): void {
  const line = inlineText(inlineFromNodes(paragraph.childNodes, ctx)).replace(/\u00a0/g, ' ');
  const last = sink.out[sink.out.length - 1];
  const joined = last !== undefined && codeLines.has(last) && last.indent === ctx.indent;
  if (joined) sink.out[sink.out.length - 1] = { ...last, attrs: { ...last.attrs, code: `${String(last.attrs.code)}\n${line}` } };
  else emit(sink, 'CODE', ctx.indent, { language: '', code: line }, {});
  codeLines.add(sink.out[sink.out.length - 1]);
}
