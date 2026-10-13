import { parseLine, type LineAttrs } from '../line-kind';
import { alertOf } from './alert';
import {
  joinLines,
  textLinesOf,
  type BlockNode,
  type DetailsNode,
  type DocumentNode,
  type ItemNode,
  type QuoteNode,
} from './block-tree';
import { deeper, draft, lineDraft, type Context, type Draft } from './drafts';
import { canonicalInline, canonicalParagraphs, type TextOptions } from './inline-text';
import { trimBlankStart } from './lines';
import { codeDraft, headingDraft, htmlDraft, mathDraft, paragraphDraft, tableDraft } from './leaf-drafts';

function itemLine(item: ItemNode, lines: string[], ctx: Context): { line: LineAttrs; lines: string[] } {
  if (ctx.quote) return { line: { kind: 'quote' }, lines };
  if (item.marker.ordered) return { line: { kind: 'ordered', start: item.marker.number }, lines };
  const task = lines.length > 0 ? parseLine(`- ${lines[0]}`) : null;
  if (task?.kind !== 'task') return { line: { kind: 'bullet' }, lines };
  return { line: { kind: 'task', checked: task.checked }, lines: [trimBlankStart(task.rest), ...lines.slice(1)] };
}

function itemDrafts(item: ItemNode, ctx: Context): Draft[] {
  const [first, ...others] = item.children;
  const lead = textLinesOf(first);
  const { line, lines } = itemLine(item, lead ?? [], ctx);
  const body = lead ? canonicalInline(joinLines(lines), ctx.text) : '';
  const head = lead || !ctx.quote ? [lineDraft(line, body, ctx.indent)] : [];
  return [...head, ...convertAll(lead ? others : item.children, deeper(ctx))];
}

function quoteDrafts(quote: QuoteNode, ctx: Context): Draft[] {
  const alert = alertOf(quote);
  const quoted = { ...ctx, quote: true };
  if (!alert) return convertAll(quote.children, quoted);
  const body = canonicalParagraphs(alert.paragraphs, ctx.text);
  return [draft('CALLOUT', { tone: alert.tone, body }, ctx.indent), ...convertAll(alert.rest, quoted)];
}

function detailsDrafts(details: DetailsNode, ctx: Context): Draft[] {
  const summary = details.summary === null ? '' : canonicalInline(details.summary, { ...ctx.text, softBreak: 'space' });
  const toggle = draft('TOGGLE', { markdown: summary, open: details.open }, ctx.indent);
  return [toggle, ...convertAll(details.children, deeper(ctx))];
}

function convert(node: BlockNode, ctx: Context): Draft[] {
  switch (node.kind) {
    case 'paragraph':
      return [paragraphDraft(node, ctx)];
    case 'heading':
      return [headingDraft(node, ctx)];
    case 'break':
      return [draft('DIVIDER', {}, ctx.indent)];
    case 'code':
      return [codeDraft(node, ctx)];
    case 'math':
      return [mathDraft(node, ctx)];
    case 'html':
      return [htmlDraft(node, ctx)];
    case 'table':
      return [tableDraft(node, ctx)];
    case 'quoin':
      return [draft(node.type, node.data, ctx.indent + node.indent)];
    case 'quote':
      return quoteDrafts(node, ctx);
    case 'details':
      return detailsDrafts(node, ctx);
    case 'item':
      return itemDrafts(node, ctx);
    case 'list':
    case 'document':
      return convertAll(node.children, ctx);
  }
}

function convertAll(nodes: readonly BlockNode[], ctx: Context): Draft[] {
  return nodes.flatMap((node) => convert(node, ctx));
}

export function treeToBlocks(document: DocumentNode, text: TextOptions): Draft[] {
  return convert(document, { indent: 0, quote: false, text });
}
