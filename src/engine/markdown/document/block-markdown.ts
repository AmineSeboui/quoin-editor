import { str } from '../../blocks/data-fields';
import { specFor } from '../../blocks/unknown-spec';
import { inlineLength } from '../../model/inline';
import type { EngineBlock } from '../../model/types';
import type { MarkdownExportContext, Schema } from '../../schema/types';
import { isQuoinType } from '../block/quoin-comment';
import { calloutMarkdown, codeMarkdown, mathMarkdown, tableMarkdown } from './block-forms';
import { quoinComment } from './comment-markdown';
import { quoteLines } from './line-format';
import { bookmarkMarkdown, embedMarkdown, fileMarkdown, imageMarkdown } from './link-forms';

export type ExportEnv = {
  readonly schema: Schema;
  readonly ctx: MarkdownExportContext;
  readonly lossless: boolean;
};

export type BlockRender = { readonly residual: number; readonly asComment: boolean };

type Data = Record<string, unknown>;

const QUOTE_PREFIX = '> ';
// Written as markdown even when lossless: the rest would lose data that only a comment can keep.
const NATIVE_TYPES = new Set(['MARKDOWN', 'DIVIDER', 'TOC', 'TOGGLE']);

function markdownLine(block: EngineBlock, data: Data): string | null {
  const kind = block.attrs.kind ?? 'paragraph';
  const markdown = str(data.markdown);
  const empty = inlineLength(block.regions.text ?? []) === 0;
  if (empty && (kind === 'paragraph' || kind === 'quote')) return null;
  return kind === 'quote' ? quoteLines(markdown.slice(QUOTE_PREFIX.length)) : markdown;
}

function toggleMarkdown(data: Data): string {
  return `<details${data.open === true ? ' open' : ''}>\n<summary>${str(data.markdown)}</summary>`;
}

function coreMarkdown(block: EngineBlock, data: Data, env: ExportEnv, residual: number): string | null {
  switch (block.type) {
    case 'MARKDOWN':
      return markdownLine(block, data);
    case 'CALLOUT':
      return calloutMarkdown(data);
    case 'CODE':
      return codeMarkdown(data);
    case 'MATH':
      return mathMarkdown(data);
    case 'DIVIDER':
      return '---';
    case 'TABLE':
      return tableMarkdown(data);
    case 'IMAGE':
      return imageMarkdown(data, env.ctx);
    case 'FILE':
      return fileMarkdown(data, env.ctx);
    case 'EMBED':
      return embedMarkdown(data, env.ctx);
    case 'BOOKMARK':
      return bookmarkMarkdown(data, env.ctx);
    case 'TOGGLE':
      return toggleMarkdown(data);
    case 'TOC':
      return Object.keys(data).length === 0 && residual === 0 ? '<!-- quoin:toc -->' : null;
    default:
      return null;
  }
}

// Returns null for a block that has no markdown form and cannot be kept as a comment, such as an empty paragraph or a
// block whose type name a comment cannot carry.
export function blockMarkdown(block: EngineBlock, env: ExportEnv, { residual, asComment }: BlockRender): string | null {
  const spec = specFor(env.schema, block.type);
  const data = spec.toData(block, env.ctx);
  const comment = () => (isQuoinType(block.type) ? quoinComment(block.type, data, residual) : null);
  if (asComment || (env.lossless && !NATIVE_TYPES.has(block.type))) return comment();
  const written = spec.toMarkdown ? spec.toMarkdown(block, env.ctx) : coreMarkdown(block, data, env, residual);
  if (written !== null) return written;
  return env.lossless || block.type !== 'MARKDOWN' ? comment() : null;
}
