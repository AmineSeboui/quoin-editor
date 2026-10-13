import type { LineAttrs } from '../line-kind';
import type { CodeNode, HeadingNode, HtmlNode, MathNode, ParagraphNode, TableNode } from './block-tree';
import { joinLines } from './block-tree';
import { draft, lineDraft, type Context, type Draft } from './drafts';
import { imageParagraph } from './image-paragraph';
import { trimBlank } from './lines';
import { canonicalCell, canonicalInline } from './inline-text';

const textLine = (ctx: Context): LineAttrs => ({ kind: ctx.quote ? 'quote' : 'paragraph' });

export function paragraphDraft(node: ParagraphNode, ctx: Context): Draft {
  const source = joinLines(node.lines);
  const image = imageParagraph(source);
  if (!image) return lineDraft(textLine(ctx), canonicalInline(source, ctx.text), ctx.indent);
  const caption = image.title ? { caption: image.title } : {};
  return draft('IMAGE', { storageKey: '', alt: image.alt, url: image.url, ...caption }, ctx.indent);
}

export function headingDraft(node: HeadingNode, ctx: Context): Draft {
  if (ctx.quote) return lineDraft({ kind: 'quote' }, canonicalInline(node.text, ctx.text), ctx.indent);
  const body = canonicalInline(node.text, ctx.text, 'br');
  return lineDraft({ kind: 'heading', level: node.level }, body, ctx.indent);
}

export function htmlDraft(node: HtmlNode, ctx: Context): Draft {
  return lineDraft(textLine(ctx), canonicalInline(trimBlank(node.lines.join('\n')), ctx.text), ctx.indent);
}

export function codeDraft(node: CodeNode, ctx: Context): Draft {
  return draft('CODE', { language: node.info.split(/[ \t]+/)[0], code: node.lines.join('\n') }, ctx.indent);
}

export function mathDraft(node: MathNode, ctx: Context): Draft {
  return draft('MATH', { latex: node.lines.join('\n') }, ctx.indent);
}

export function tableDraft(node: TableNode, ctx: Context): Draft {
  const rows = [node.header, ...node.rows].map((row) => row.map((cell) => canonicalCell(cell, ctx.text)));
  return draft('TABLE', { rows, header: true, align: node.align }, ctx.indent);
}
