import { createContext } from 'react';
import type { EditorState, EngineBlock } from '../../engine';
import { blockById } from '../../engine/model/doc';
import { primaryRegion } from '../../engine/state/selection';
import { headingLevel } from '../../engine/render/heading-level';
import { englishRendererLabels, type RendererLabels } from './renderer-labels';

/** The text an empty block shows in its main region, read again whenever the editor state changes. */
export type BlockPlaceholder = (state: EditorState, block: EngineBlock) => string | undefined;

/** The placeholder that shows an empty heading its own name, and nothing for other blocks. */
export const headingPlaceholderOf =
  (heading: RendererLabels['heading']): BlockPlaceholder =>
  (_state, { type, attrs }) =>
    type === 'MARKDOWN' && attrs.kind === 'heading' ? heading(headingLevel(attrs.level)) : undefined;

export const headingPlaceholder = headingPlaceholderOf(englishRendererLabels.heading);

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
