import { createBlockCodec } from '../blocks/codec';
import { isTextFlow } from '../commands/block-helpers';
import { serializeInline } from '../markdown/inline/serialize-inline';
import { toMarkdown } from '../markdown/document/to-markdown';
import { stripComments } from '../markdown/document/strip-comments';
import { toHTML, type HTMLOptions } from '../render/to-html';
import { createSchema } from '../schema/create-schema';
import { primaryRegion } from '../state/selection';
import type { Slice } from './slice';

function sliceText(slice: Slice, options: HTMLOptions): string {
  const schema = options.schema ?? createSchema();
  if (slice.blocks.length === 1 && slice.openStart && slice.openEnd) {
    const pieces = createBlockCodec(schema).toEngineBlocks(slice.blocks[0]);
    const block = pieces.length === 1 ? stripComments(pieces[0]) : null;
    const region = block === null || !isTextFlow(schema, block) ? null : primaryRegion(schema, block);
    if (block !== null && region !== null) return serializeInline(block.regions[region] ?? []);
  }
  const markdown = toMarkdown(slice.blocks, { schema, resolveAssetUrl: options.resolveAssetUrl, comments: false });
  return markdown.replace(/\n$/, '');
}

export function sliceToClipboard(slice: Slice, options: HTMLOptions = {}): { json: string; html: string; text: string } {
  return {
    json: JSON.stringify({ quoin: 1, slice }),
    html: toHTML(slice.blocks, options),
    text: sliceText(slice, options),
  };
}
