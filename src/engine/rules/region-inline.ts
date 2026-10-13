import { requireBlockIndex } from '../model/doc';
import type { Inline } from '../model/types';
import type { EditorState } from '../state/editor-state';
import type { InputRuleRange } from './input-rule';

export function regionInline(state: EditorState, range: InputRuleRange): Inline {
  return state.doc.blocks[requireBlockIndex(state.doc, range.block)].regions[range.region];
}
