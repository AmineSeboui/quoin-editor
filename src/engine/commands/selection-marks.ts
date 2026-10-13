import { blockById, requireBlockIndex } from '../model/doc';
import { sliceInline } from '../model/inline';
import { orderedRange } from '../model/position';
import type { EngineBlock, Inline, Mark, Selection, TextSelection } from '../model/types';
import type { Schema } from '../schema/types';
import type { EditorState } from '../state/editor-state';
import { isCollapsed, primaryRegion, selectedBlockIds } from '../state/selection';
import { isTextFlow, regionLength } from './block-helpers';
import { caretMarks } from './caret-marks';

type MarkAttrs = Readonly<Record<string, unknown>>;

export type MarkRange = { block: string; region: string; from: number; to: number };

export function matchesMark(mark: Mark, type: string, attrs?: MarkAttrs): boolean {
  return mark.type === type && Object.entries(attrs ?? {}).every(([key, value]) => mark.attrs?.[key] === value);
}

function wholeRegion(schema: Schema, block: EngineBlock): MarkRange | null {
  const region = primaryRegion(schema, block);
  if (!isTextFlow(schema, block) || region === null) return null;
  return { block: block.id, region, from: 0, to: regionLength(block, region) };
}

function textRanges(state: EditorState, selection: TextSelection): MarkRange[] {
  const { doc, schema } = state;
  const { from, to } = orderedRange(doc, selection.anchor, selection.head);
  if (from.block === to.block) {
    // Ranges across table cells belong to the table extension, so nothing is marked here.
    if (from.region !== to.region) return [];
    return [{ block: from.block, region: from.region, from: from.offset, to: to.offset }];
  }
  const first = requireBlockIndex(doc, from.block);
  const last = requireBlockIndex(doc, to.block);
  return doc.blocks.slice(first, last + 1).flatMap((block, i) => {
    const whole = wholeRegion(schema, block);
    if (whole === null) return [];
    const startsHere = i === 0 && from.region === whole.region;
    const endsHere = first + i === last && to.region === whole.region;
    return [{ ...whole, from: startsHere ? from.offset : 0, to: endsHere ? to.offset : whole.to }];
  });
}

function selectionRanges(state: EditorState, selection: Selection): MarkRange[] {
  if (selection.kind === 'text') return textRanges(state, selection);
  return selectedBlockIds(state.doc, selection).flatMap((id) => {
    const whole = wholeRegion(state.schema, state.doc.blocks[requireBlockIndex(state.doc, id)]);
    return whole === null ? [] : [whole];
  });
}

export function markRanges(state: EditorState): MarkRange[] {
  const { selection } = state;
  return selection === null ? [] : selectionRanges(state, selection).filter((range) => range.from < range.to);
}

export function rangeContent(state: EditorState, range: MarkRange): Inline {
  const inline = blockById(state.doc, range.block)?.regions[range.region] ?? [];
  return sliceInline(inline, range.from, range.to);
}

export function markCoverage(content: Inline, type: string, attrs?: MarkAttrs): { some: boolean; every: boolean } {
  const carries = (node: Inline[number]) => node.marks.some((mark) => matchesMark(mark, type, attrs));
  return { some: content.some(carries), every: content.every(carries) };
}

export function selectionHasMark(state: EditorState, type: string, attrs?: MarkAttrs): boolean {
  const { selection } = state;
  if (selection?.kind === 'text' && isCollapsed(selection)) {
    const marks = caretMarks(state.doc, state.schema, state.storedMarks, selection.head);
    return marks.some((mark) => matchesMark(mark, type, attrs));
  }
  const ranges = markRanges(state);
  return ranges.length > 0 && ranges.every((range) => markCoverage(rangeContent(state, range), type, attrs).every);
}
