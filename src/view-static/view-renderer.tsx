import type { ReactNode } from 'react';
import type { CodeHighlighter } from '../blocks/code/code-highlighter';
import { coreBlockSpecs } from '../engine/blocks/core-specs';
import { blockNode } from '../engine/render/block-node';
import type { BlockRenderer } from '../engine/render/html-env';
import type { HtmlElement } from '../engine/render/html-node';
import { blockByType, parsedData, type AnyBlockDefinition } from '../registry';
import { highlightedCode } from './code-nodes';

export type ViewBlockOptions = {
  readonly blockTypes?: readonly AnyBlockDefinition[];
  readonly highlight?: CodeHighlighter;
};

const QUOIN_TYPES = new Set(coreBlockSpecs.map((spec) => spec.type));

// A server render has no error boundary to catch a throw, so data that does not parse draws as Quoin's own node.
function previewData(definition: AnyBlockDefinition, stored: unknown): Record<string, unknown> | undefined {
  try {
    return parsedData(definition, (stored as Record<string, unknown> | undefined) ?? {});
  } catch {
    return undefined;
  }
}

/**
 * Draws each block as toHTML does, with code through the highlighter and a block of a type Quoin does not draw itself
 * through the preview of its definition, which it puts in `slots`.
 */
export function viewRenderer({ blockTypes = [], highlight }: ViewBlockOptions, slots: Map<HtmlElement, ReactNode>): BlockRenderer {
  return (block, view, env) => {
    const node = blockNode(block, view, env);
    if (typeof node === 'string') return node;
    if (block.type === 'CODE') return highlightedCode(node, block, highlight);
    const definition = QUOIN_TYPES.has(block.type) ? undefined : blockByType(blockTypes, block.type);
    const Preview = definition?.preview;
    const data = Preview && previewData(definition, block.attrs.data);
    if (Preview && data) slots.set(node, <Preview data={data} blockId={block.id} />);
    return node;
  };
}
