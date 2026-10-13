import { blockById } from '../model/doc';
import type { EngineBlock } from '../model/types';
import type { EditorState } from '../state/editor-state';
import { selectedBlockIds } from '../state/selection';
import { selectionHasMark } from './selection-marks';

function hasAttrs(block: EngineBlock, attrs?: Record<string, unknown>): boolean {
  return Object.entries(attrs ?? {}).every(([key, value]) => block.attrs[key] === value);
}

export function isActive(state: EditorState, name: string, attrs?: Record<string, unknown>): boolean {
  if (state.schema.marks.has(name)) return selectionHasMark(state, name, attrs);
  const blocks = selectedBlockIds(state.doc, state.selection).flatMap((id) => blockById(state.doc, id) ?? []);
  const isBlockType = state.schema.blocks.has(name);
  const matches = (block: EngineBlock) =>
    isBlockType ? block.type === name : block.type === 'MARKDOWN' && block.attrs.kind === name;
  return blocks.length > 0 && blocks.every((block) => matches(block) && hasAttrs(block, attrs));
}
