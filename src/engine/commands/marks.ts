import { blockById } from '../model/doc';
import { atom } from '../model/inline';
import { addMark, removeMark } from '../model/marks';
import { orderedRange } from '../model/position';
import type { Attrs, Inline, Mark, Pos } from '../model/types';
import { isPaletteColor } from '../markdown/palette';
import { sanitizeHref } from '../markdown/urls';
import type { EditorState } from '../state/editor-state';
import { isCollapsed, textSelection } from '../state/selection';
import { Transaction } from '../state/transaction';
import { addMarkStep, removeMarkStep } from '../transform/mark-steps';
import { replaceInlineStep } from '../transform/replace-inline-step';
import { caretMarks } from './caret-marks';
import type { Command } from './command';
import { deleteRange } from './delete-range';
import { markExtent } from './mark-extent';
import {
  markCoverage,
  markRanges,
  matchesMark,
  rangeContent,
  selectionHasMark,
  type MarkRange,
} from './selection-marks';

type Mode = 'add' | 'remove' | 'toggle';

const COLOR_MARKS = new Set(['highlight', 'color', 'background']);
const KEPT_ON_CLEAR = new Set(['link', 'comment']);

function makeMark(type: string, attrs?: Attrs): Mark {
  return attrs !== undefined && Object.keys(attrs).length > 0 ? { type, attrs } : { type };
}

function validMark(type: string, attrs?: Attrs): boolean {
  if (!COLOR_MARKS.has(type)) return true;
  const color = attrs?.color;
  return color === undefined ? type === 'highlight' : isPaletteColor(color);
}

function collapsedCaret(state: EditorState): Pos | null {
  const { selection } = state;
  return selection?.kind === 'text' && isCollapsed(selection) ? selection.head : null;
}

function editRanges(
  state: EditorState,
  dispatch: ((tr: Transaction) => void) | undefined,
  ranges: readonly MarkRange[],
  edit: (tr: Transaction, range: MarkRange, content: Inline) => void,
): boolean {
  if (ranges.length === 0) return false;
  const tr = new Transaction(state);
  for (const range of ranges) edit(tr, range, rangeContent(state, range));
  dispatch?.(tr);
  return true;
}

function applyMark(type: string, attrs: Attrs | undefined, mode: Mode): Command {
  return (state, dispatch) => {
    if (mode !== 'remove' && !validMark(type, attrs)) return false;
    const mark = makeMark(type, attrs);
    const caret = collapsedCaret(state);
    if (caret !== null) {
      const current = caretMarks(state.doc, state.schema, state.storedMarks, caret);
      const active = current.some((existing) => matchesMark(existing, type, attrs));
      const remove = mode === 'remove' || (mode === 'toggle' && active);
      dispatch?.(new Transaction(state).setStoredMarks(remove ? removeMark(current, type) : addMark(current, mark)));
      return true;
    }
    const remove = mode === 'remove' || (mode === 'toggle' && selectionHasMark(state, type, attrs));
    return editRanges(state, dispatch, markRanges(state), (tr, { block, region, from, to }, content) => {
      const coverage = markCoverage(content, type, attrs);
      if (remove && coverage.some) tr.step(removeMarkStep(block, region, from, to, type));
      if (!remove && !coverage.every) tr.step(addMarkStep(block, region, from, to, mark));
    });
  };
}

export function toggleMark(type: string, attrs?: Attrs): Command {
  return applyMark(type, attrs, 'toggle');
}

export function setMark(type: string, attrs?: Attrs): Command {
  return applyMark(type, attrs, 'add');
}

export function unsetMark(type: string): Command {
  return applyMark(type, undefined, 'remove');
}

function linkRanges(state: EditorState): MarkRange[] {
  const caret = collapsedCaret(state);
  if (caret === null) return markRanges(state);
  const inline = blockById(state.doc, caret.block)?.regions[caret.region] ?? [];
  const extent = markExtent(inline, caret.offset, 'link');
  return extent === null ? [] : [{ block: caret.block, region: caret.region, ...extent }];
}

export function setLink(href: string, title?: string): Command {
  const safe = sanitizeHref(href);
  return (state, dispatch) => {
    if (safe === null || safe === '') return false;
    const link: Mark = { type: 'link', attrs: title ? { href: safe, title } : { href: safe } };
    return editRanges(state, dispatch, linkRanges(state), (tr, { block, region, from, to }) => {
      tr.step(addMarkStep(block, region, from, to, link));
    });
  };
}

export const unsetLink: Command = (state, dispatch) =>
  editRanges(state, dispatch, linkRanges(state), (tr, { block, region, from, to }, content) => {
    if (markCoverage(content, 'link').some) tr.step(removeMarkStep(block, region, from, to, 'link'));
  });

export const clearFormatting: Command = (state, dispatch) => {
  const clearable = (mark: Mark) => !KEPT_ON_CLEAR.has(mark.type);
  const caret = collapsedCaret(state);
  if (caret !== null) {
    const current = caretMarks(state.doc, state.schema, state.storedMarks, caret);
    dispatch?.(new Transaction(state).setStoredMarks(current.filter((mark) => !clearable(mark))));
    return true;
  }
  return editRanges(state, dispatch, markRanges(state), (tr, { block, region, from, to }, content) => {
    const types = new Set(content.flatMap((node) => node.marks.filter(clearable).map((mark) => mark.type)));
    for (const type of types) tr.step(removeMarkStep(block, region, from, to, type));
  });
};

export function insertAtom(type: string, attrs: Attrs): Command {
  return (state, dispatch) => {
    const { doc, schema, selection } = state;
    if (selection?.kind !== 'text') return false;
    const tr = new Transaction(state);
    const { from, to } = orderedRange(doc, selection.anchor, selection.head);
    const caret = deleteRange(tr, schema, from, to);
    const node = atom(type, attrs, caretMarks(tr.doc, schema, tr.storedMarks, caret));
    tr.step(replaceInlineStep(caret.block, caret.region, caret.offset, caret.offset, [node]));
    tr.setSelection(textSelection({ ...caret, offset: caret.offset + 1 }));
    dispatch?.(tr);
    return true;
  };
}

export function insertMention(mention: { id: string; label: string; kind?: string }): Command {
  const { id, label, kind } = mention;
  return insertAtom('mention', kind === undefined ? { id, label } : { id, label, kind });
}
