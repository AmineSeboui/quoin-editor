import type { ReactNode } from 'react';
import type { CodeHighlighter } from '../blocks/code/code-highlighter';
import { coreBlockSpecs } from '../engine/blocks/core-specs';
import { blockNode } from '../engine/render/block-node';
import type { BlockRenderer } from '../engine/render/html-env';
import type { HtmlElement } from '../engine/render/html-node';
import { blockByType, type AnyBlockDefinition } from '../registry';
import { highlightedCode } from './code-nodes';

export type ViewBlockOptions = {
  readonly blockTypes?: readonly AnyBlockDefinition[];
  readonly highlight?: CodeHighlighter;
};

const QUOIN_TYPES = new Set(coreBlockSpecs.map((spec) => spec.type));

/**
 * Draws each block as toHTML does, with code through the highlighter and a block of a type Quoin does not draw itself
 * through the preview of its definition, which it puts in `slots`.
 */
export function viewRenderer({ blockTypes = [], highlight }: ViewBlockOptions, slots: Map<HtmlElement, ReactNode>): BlockRenderer {
  return (block, view, env) => {
    const node = blockNode(block, view, env);
    if (typeof node === 'string') return node;
    if (block.type === 'CODE') return highlightedCode(node, block, highlight);
    const Preview = QUOIN_TYPES.has(block.type) ? undefined : blockByType(blockTypes, block.type)?.preview;
    if (Preview) {
      const data = (block.attrs.data as Record<string, unknown> | undefined) ?? {};
      slots.set(node, <Preview data={data} blockId={block.id} />);
    }
    return node;
  };
}
