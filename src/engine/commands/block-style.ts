import type { Align } from '../blocks/data-fields';
import { isPaletteColor } from '../markdown/palette';
import { blockById } from '../model/doc';
import { selectedBlockIds } from '../state/selection';
import { Transaction } from '../state/transaction';
import { patchChangesAttrs, setAttrsStep, type AttrsPatch } from '../transform/attrs-steps';
import type { EditorState } from '../state/editor-state';
import type { Command } from './command';

function patchBlocks(state: EditorState, patch: AttrsPatch, only?: string): Transaction | null {
  const changing = selectedBlockIds(state.doc, state.selection).filter((id) => {
    const block = blockById(state.doc, id);
    return block !== undefined && (only === undefined || block.type === only) && patchChangesAttrs(block.attrs, patch);
  });
  if (changing.length === 0) return null;
  const tr = new Transaction(state);
  for (const id of changing) tr.step(setAttrsStep(id, patch));
  return tr;
}

function patchCommand(patch: AttrsPatch, only?: string): Command {
  return (state, dispatch) => {
    const tr = patchBlocks(state, patch, only);
    if (tr === null) return false;
    dispatch?.(tr);
    return true;
  };
}

export function setAttrs(patch: Record<string, unknown>): Command {
  return patchCommand(patch);
}

export function setTextAlign(align: Align | null): Command {
  return patchCommand({ align: align ?? undefined }, 'MARKDOWN');
}

export function setBlockColor(colors: { color?: string | null; background?: string | null }): Command {
  const patch: Record<string, string | undefined> = {};
  for (const key of ['color', 'background'] as const) {
    const value = colors[key];
    if (value !== undefined) patch[key] = value ?? undefined;
  }
  const valid = Object.values(patch).every((value) => value === undefined || isPaletteColor(value));
  return valid ? patchCommand(patch, 'MARKDOWN') : () => false;
}
