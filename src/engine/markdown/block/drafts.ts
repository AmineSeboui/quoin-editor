import type { LineAttrs } from '../line-kind';
import { lineMarkdown } from '../line-markdown';
import type { QuoinBlock } from '../../model/quoin-block';
import type { TextOptions } from './inline-text';

export type Draft = Omit<QuoinBlock, 'id'>;

export type Context = { readonly indent: number; readonly quote: boolean; readonly text: TextOptions };

export function draft(type: string, data: Record<string, unknown>, indent: number): Draft {
  return indent > 0 ? { type, data, indent } : { type, data };
}

export function lineDraft(line: LineAttrs, body: string, indent: number): Draft {
  return draft('MARKDOWN', { markdown: lineMarkdown(line, body) }, indent);
}

export const deeper = (ctx: Context): Context => ({ ...ctx, indent: ctx.indent + 1 });
