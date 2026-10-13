import { inlineLength, removeMarkRange } from '../model/inline';
import type { BlockAttrs, EngineBlock, Inline } from '../model/types';
import { codeBlock } from './html-code';
import { child, emit, emitText, PARAGRAPH, type Context, type Sink } from './html-context';
import {
  hasBlockDescendant,
  isBlockLevel,
  isDropped,
  isElement,
  MAX_DEPTH,
  tagName,
  TEXT_NODE,
} from './html-dom';
import { inlineFromNodes } from './html-inline';
import { list, listItem, wordListItem } from './html-lists';
import { elementMarks } from './html-marks';
import { figure, imageBlock } from './html-media';
import { isMonospace, keepsWhitespace, parseStyle } from './html-styles';
import { tableBlock } from './html-table';

const QUOTE: BlockAttrs = { kind: 'quote' };
const HEADING = /^h([1-6])$/;

function emitRun(run: readonly Node[], ctx: Context, sink: Sink): void {
  const inline = inlineFromNodes(run, ctx);
  if (inline.length === 0) return;
  const plain = ctx.run.kind === 'heading' ? removeMarkRange(inline, 0, inlineLength(inline), 'bold') : inline;
  emitText(sink, ctx.indent, ctx.run, plain);
}

function details(element: Element, ctx: Context, sink: Sink): void {
  const summary = Array.from(element.children).find((part) => tagName(part) === 'summary');
  const title: Inline = summary === undefined ? [] : inlineFromNodes(summary.childNodes, ctx);
  emit(sink, 'TOGGLE', ctx.indent, { open: element.hasAttribute('open') }, { text: title });
  const body = Array.from(element.childNodes).filter((part) => part !== summary);
  sink.walk(body, child(ctx, { indent: ctx.indent + 1, run: PARAGRAPH }));
}

function styledContext(element: Element, outer: Context): { ctx: Context; code: boolean } {
  const styles = parseStyle(element.getAttribute('style'));
  const keeps = keepsWhitespace(styles);
  const marks = elementMarks(element, outer.marks);
  const ctx = { ...outer, marks, preformatted: keeps ?? outer.preformatted };
  return { ctx, code: keeps === true && isMonospace(styles) };
}

function handleBlock(element: Element, outer: Context, sink: Sink): void {
  const { ctx, code } = styledContext(element, outer);
  const tag = tagName(element);
  if (code && tag === 'div') return codeBlock(element, ctx, sink);
  const heading = HEADING.exec(tag);
  if (heading) return sink.walk(element.childNodes, child(ctx, { run: { kind: 'heading', level: Number(heading[1]) } }));
  switch (tag) {
    case 'ul':
    case 'ol':
      return list(element, ctx, sink);
    case 'li':
      return listItem(element, { kind: 'bullet' }, ctx, sink);
    case 'blockquote': {
      const nested = ctx.run.kind === 'quote';
      return sink.walk(element.childNodes, child(ctx, { indent: ctx.indent + (nested ? 1 : 0), run: QUOTE }));
    }
    case 'pre':
      return codeBlock(element, ctx, sink);
    case 'hr':
      return emit(sink, 'DIVIDER', ctx.indent, {}, {});
    case 'table':
      return tableBlock(element, ctx, sink);
    case 'img':
      return imageBlock(element, [], ctx, sink);
    case 'figure':
      return figure(element, ctx, sink);
    case 'details':
      return details(element, ctx, sink);
    case 'p':
      if (wordListItem(element, ctx, sink)) return;
  }
  sink.walk(element.childNodes, child(ctx));
}

function walkNodes(nodes: Iterable<Node>, ctx: Context, sink: Sink): void {
  const all = Array.from(nodes);
  if (ctx.depth > MAX_DEPTH) return emitRun(all, ctx, sink);
  let run: Node[] = [];
  const flush = () => {
    emitRun(run, ctx, sink);
    run = [];
  };
  for (const node of all) {
    if (node.nodeType === TEXT_NODE) run.push(node);
    else if (!isElement(node) || isDropped(node)) continue;
    else if (isBlockLevel(node)) {
      flush();
      handleBlock(node, ctx, sink);
    } else if (hasBlockDescendant(node)) {
      flush();
      sink.walk(node.childNodes, child(styledContext(node, ctx).ctx));
    } else run.push(node);
  }
  flush();
}

export function blocksFromBody(body: Element, newId: () => string): EngineBlock[] {
  const sink: Sink = { out: [], newId, walk: (nodes, ctx) => walkNodes(nodes, ctx, sink) };
  sink.walk(body.childNodes, { indent: 0, marks: [], run: PARAGRAPH, preformatted: false, depth: 0 });
  return sink.out;
}
