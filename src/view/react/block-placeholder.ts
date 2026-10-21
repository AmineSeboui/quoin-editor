import { createContext } from 'react';
import type { EditorState, EngineBlock } from '../../engine';
import { blockById } from '../../engine/model/doc';
import { primaryRegion } from '../../engine/state/selection';
import { headingLevel } from '../../engine/render/heading-level';

/** The text an empty block shows in its main region, read again whenever the editor state changes. */
export type BlockPlaceholder = (state: EditorState, block: EngineBlock) => string | undefined;

export const headingPlaceholder: BlockPlaceholder = (_state, { type, attrs }) =>
  type === 'MARKDOWN' && attrs.kind === 'heading' ? `Heading ${headingLevel(attrs.level)}` : undefined;

export const BlockPlaceholderContext = createContext<BlockPlaceholder>(headingPlaceholder);

export function regionPlaceholder(
  state: EditorState,
  blockId: string,
  region: string,
  placeholderOf: BlockPlaceholder,
): string | undefined {
  const block = blockById(state.doc, blockId);
  return block !== undefined && primaryRegion(state.schema, block) === region ? placeholderOf(state, block) : undefined;
}
