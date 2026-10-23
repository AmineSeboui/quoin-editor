import * as Y from 'yjs';
import type { EngineDoc, Pos, Selection } from '../engine/model/types';
import type { Schema } from '../engine/schema/types';
import { blockRangeSelection, nodeSelection, textSelection, validateSelection } from '../engine/state/selection';
import { absolute, relative } from './carets';
import type { Shared } from './shared';

/**
 * One end of a selection as awareness holds it: a block, and for a caret its region and offset with the Yjs relative
 * position of that place, which stays on its character while others type before it.
 */
export type AwarePos = {
  readonly block: string;
  readonly region?: string;
  readonly offset?: number;
  readonly rel?: unknown;
};
export type AwareSelection = {
  readonly anchor: AwarePos;
  readonly head: AwarePos;
};

function awarePos(shared: Shared, pos: Pos): AwarePos {
  try {
    return {
      ...pos,
      rel: Y.relativePositionToJSON(relative(shared.text, shared.layout, pos)),
    };
  } catch {
    return pos;
  }
}

export function toAware(shared: Shared, selection: Selection | null): AwareSelection | null {
  if (selection === null) return null;
  if (selection.kind === 'text') {
    return {
      anchor: awarePos(shared, selection.anchor),
      head: awarePos(shared, selection.head),
    };
  }
  const [anchor, head] =
    selection.kind === 'node' ? [selection.block, selection.block] : [selection.anchor, selection.head];
  return { anchor: { block: anchor }, head: { block: head } };
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

// What another client wrote is read with care: any of it can be missing or of another type.
function textPos(shared: Shared | null, doc: EngineDoc, value: Record<string, unknown>): Pos | null {
  if (shared !== null && value.rel !== undefined) {
    try {
      const found = absolute(shared.text, shared.layout, Y.createRelativePositionFromJSON(value.rel));
      if (found !== null) return found;
    } catch {
      // A relative position that does not parse falls back to the block and offset beside it.
    }
  }
  const { block, region, offset } = value;
  const placed = typeof region === 'string' && typeof offset === 'number' && Number.isInteger(offset) && offset >= 0;
  return placed && typeof block === 'string' && doc.index.has(block) ? { block, region, offset } : null;
}

const blockOf = (doc: EngineDoc, value: Record<string, unknown>): string | null =>
  typeof value.block === 'string' && doc.index.has(value.block) ? value.block : null;

/** The selection another client wrote, in this editor's document, or null when it names nothing that is here. */
export function fromAware(shared: Shared | null, doc: EngineDoc, schema: Schema, value: unknown): Selection | null {
  if (!isRecord(value) || !isRecord(value.anchor) || !isRecord(value.head)) return null;
  const { anchor, head } = value;
  if (anchor.region === undefined && head.region === undefined) {
    const [from, to] = [blockOf(doc, anchor), blockOf(doc, head)];
    if (from === null || to === null) return null;
    return from === to ? nodeSelection(from) : blockRangeSelection(from, to);
  }
  const [from, to] = [textPos(shared, doc, anchor), textPos(shared, doc, head)];
  return from === null || to === null ? null : validateSelection(doc, schema, textSelection(from, to));
}
