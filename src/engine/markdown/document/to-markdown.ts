import { createBlockCodec } from '../../blocks/codec';
import type { QuoinBlock } from '../../model/quoin-block';
import { createSchema } from '../../schema/create-schema';
import type { Schema } from '../../schema/types';
import { startsHtmlBlock } from '../block/html-blocks';
import { blockMarkdown, type ExportEnv } from './block-markdown';
import { needsComment } from './comment-form';
import { hangLines, indentLines } from './line-format';
import { createListContext, type Container, type Placement } from './list-context';
import { stripComments } from './strip-comments';

export type ToMarkdownOptions = {
  schema?: Schema;
  resolveAssetUrl?: (storageKey: string) => string;
  comments?: boolean;
  /**
   * Write every block that markdown cannot hold in full as a quoin comment, so that fromMarkdown reads back all of its
   * data. Plain export, the default, writes native markdown and drops what that form cannot carry: block-level align,
   * colour, background and other extra keys, the indent no container explains, and the data of the other block types.
   */
  lossless?: boolean;
};

type Role = 'item' | 'quote' | 'other';

type Piece = {
  readonly text: string;
  readonly role: Role;
  readonly prefix: string;
  readonly parent?: Container;
  readonly opened?: Container;
  readonly bare: boolean;
  readonly fragile: boolean;
  readonly leadsHtml: boolean;
};

function roleOf({ line, hang }: Placement): Role {
  if (hang > 0) return 'item';
  return line === 'quote' ? 'quote' : 'other';
}

const closing = ({ prefix }: Container): Piece => ({
  text: indentLines('</details>', prefix),
  role: 'other',
  prefix,
  bare: false,
  fragile: false,
  leadsHtml: false,
});

function pieceOf(text: string, placement: Placement): Piece {
  const { hang, prefix } = placement;
  return {
    text: indentLines(hangLines(text, hang), prefix),
    role: roleOf(placement),
    prefix,
    parent: placement.parent,
    opened: placement.container,
    bare: placement.bare,
    fragile: placement.fragile,
    leadsHtml: hang > 0 && startsHtmlBlock(text.split('\n')[0].slice(hang)),
  };
}

// Markdown reads the first paragraph under an empty item as the text of the item.
function takenAsItemText(previous: Piece | undefined, { parent, line }: Placement): boolean {
  return line === 'paragraph' && parent !== undefined && previous?.opened === parent && previous.bare;
}

// A blank line right after an empty item ends it. A nested item needs one when it cannot interrupt a paragraph, and
// when the text of its parent opens an HTML block, which would otherwise swallow the nested line.
function separator(previous: Piece, next: Piece): string {
  const nested = next.parent !== undefined && next.parent === previous.opened;
  if (nested && previous.bare) return '\n';
  if (previous.role === 'item' && next.role === 'item') {
    return nested && (next.fragile || previous.leadsHtml) ? '\n\n' : '\n';
  }
  if (previous.role === 'quote' && next.role === 'quote' && previous.parent === next.parent) {
    return `\n${next.prefix}>\n`;
  }
  return '\n\n';
}

function join(pieces: readonly Piece[]): string {
  const markdown = pieces.map((piece, at) => (at === 0 ? piece.text : separator(pieces[at - 1], piece) + piece.text));
  return markdown.length === 0 ? '' : `${markdown.join('')}\n`;
}

export function toMarkdown(blocks: readonly QuoinBlock[], options: ToMarkdownOptions = {}): string {
  const schema = options.schema ?? createSchema();
  const codec = createBlockCodec(schema);
  const env: ExportEnv = {
    schema,
    lossless: options.lossless === true,
    ctx: {
      ...codec.context,
      resolveAssetUrl: options.resolveAssetUrl ?? ((storageKey) => storageKey),
      comments: options.comments !== false,
    },
  };
  const context = createListContext();
  const pieces: Piece[] = [];
  const closeToggles = (containers: readonly Container[]) => {
    for (const container of containers) if (container.kind === 'toggle') pieces.push(closing(container));
  };

  for (const engineBlock of blocks.flatMap((block) => codec.toEngineBlocks(block))) {
    const block = env.ctx.comments ? engineBlock : stripComments(engineBlock);
    const placement = context.place(
      block,
      env.lossless ? (residual) => needsComment(block, residual, schema, env.ctx) : undefined,
    );
    closeToggles(placement.closed);
    const text = blockMarkdown(placement.block, env, {
      residual: placement.residual,
      asComment: placement.comment || (env.lossless && takenAsItemText(pieces[pieces.length - 1], placement)),
    });
    if (text) pieces.push(pieceOf(text, placement));
  }
  closeToggles(context.finish());
  return join(pieces);
}
