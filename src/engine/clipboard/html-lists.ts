import type { BlockAttrs } from '../model/types';
import { child, emitText, PARAGRAPH, type Context, type Sink } from './html-context';
import { breaksRun, hasBlockDescendant, hasClass, isElement, MAX_DEPTH, tagName } from './html-dom';
import { inlineFromNodes, isMsoIgnored } from './html-inline';

const LIST_TAGS = new Set(['ul', 'ol']);
const MARKER_NUMBER = /^(\d+)[.)]$/;
const MARKER_LETTERS = /^[a-z]{1,4}[.)]$/i;

function checkboxState(node: Node): boolean | null {
  if (!isElement(node)) return null;
  if (tagName(node) === 'input' && node.getAttribute('type')?.toLowerCase() === 'checkbox') {
    return node.hasAttribute('checked');
  }
  if (hasClass(node, 'checkbox-on')) return true;
  return hasClass(node, 'checkbox-off') ? false : null;
}

function takeCheckbox(nodes: readonly Node[]): { checked: boolean | null; rest: Node[] } {
  const at = nodes.findIndex((node) => checkboxState(node) !== null);
  if (at < 0) return { checked: null, rest: [...nodes] };
  return { checked: checkboxState(nodes[at]), rest: nodes.filter((_, index) => index !== at) };
}

const isPlainWrapper = (node: Node): node is Element =>
  isElement(node) && ['p', 'div'].includes(tagName(node)) && !hasBlockDescendant(node);

export function listItem(item: Element, base: BlockAttrs, ctx: Context, sink: Sink): void {
  const own = takeCheckbox(Array.from(item.childNodes));
  const split = own.rest.findIndex(breaksRun);
  let content = inlineFromNodes(split < 0 ? own.rest : own.rest.slice(0, split), ctx.marks);
  let rest = split < 0 ? [] : own.rest.slice(split);
  let checked = own.checked;
  if (content.length === 0 && rest.length > 0 && isPlainWrapper(rest[0])) {
    const inner = takeCheckbox(Array.from(rest[0].childNodes));
    checked = checked ?? inner.checked;
    content = inlineFromNodes(inner.rest, ctx.marks);
    rest = rest.slice(1);
  }
  emitText(sink, ctx.indent, checked === null ? base : { kind: 'task', checked }, content);
  sink.walk(rest, child(ctx, { indent: ctx.indent + 1, run: PARAGRAPH }));
}

function firstNumber(list: Element): number {
  const start = Number.parseInt(list.getAttribute('start') ?? '', 10);
  return Number.isInteger(start) && start >= 0 ? start : 1;
}

export function list(element: Element, ctx: Context, sink: Sink): void {
  const ordered = tagName(element) === 'ol';
  const first = firstNumber(element);
  let position = 0;
  for (const node of Array.from(element.childNodes)) {
    if (isElement(node) && tagName(node) === 'li') {
      listItem(node, ordered ? { kind: 'ordered', start: first + position } : { kind: 'bullet' }, ctx, sink);
      position++;
    } else if (isElement(node) && LIST_TAGS.has(tagName(node)) && ctx.depth <= MAX_DEPTH) {
      list(node, child(ctx, { indent: ctx.indent + 1 }), sink);
    } else {
      sink.walk([node], child(ctx));
    }
  }
}

function wordMarker(paragraph: Element): BlockAttrs {
  const ignored = Array.from(paragraph.querySelectorAll('[style]')).find(isMsoIgnored);
  const marker = (ignored?.textContent ?? '').replace(/\s+/g, '');
  const number = MARKER_NUMBER.exec(marker);
  if (number) return { kind: 'ordered', start: Number(number[1]) };
  return MARKER_LETTERS.test(marker) ? { kind: 'ordered', start: 1 } : { kind: 'bullet' };
}

export function wordListItem(paragraph: Element, ctx: Context, sink: Sink): boolean {
  const style = (paragraph.getAttribute('style') ?? '').toLowerCase();
  const level = /mso-list:[^;]*\blevel(\d+)/.exec(style);
  const listClass = (paragraph.getAttribute('class') ?? '').toLowerCase().includes('msolistparagraph');
  if (level === null && !listClass) return false;
  const depth = level === null ? 0 : Math.max(0, Number(level[1]) - 1);
  emitText(sink, ctx.indent + depth, wordMarker(paragraph), inlineFromNodes(paragraph.childNodes, ctx.marks));
  return true;
}
