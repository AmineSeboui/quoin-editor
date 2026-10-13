import { isPaletteColor } from '../markdown/palette';
import { blockById } from '../model/doc';
import { selectedBlockIds } from '../state/selection';
import { Transaction } from '../state/transaction';
import { setAttrsStep, type AttrsPatch } from '../transform/attrs-steps';
import type { EditorState } from '../state/editor-state';
import type { Command } from './command';

type Align = 'left' | 'center' | 'right' | 'justify';

function patchBlocks(state: EditorState, patch: AttrsPatch, only?: string): Transaction | null {
  const ids = selectedBlockIds(state.doc, state.selection).filter(
    (id) => only === undefined || blockById(state.doc, id)?.type === only,
  );
  if (ids.length === 0 || Object.keys(patch).length === 0) return null;
  const tr = new Transaction(state);
  for (const id of ids) tr.step(setAttrsStep(id, patch));
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
