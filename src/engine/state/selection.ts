import { specFor } from '../blocks/unknown-spec';
import { blockById, indexOfBlock, requireBlockIndex } from '../model/doc';
import { inlineLength } from '../model/inline';
import { comparePos, orderedRange } from '../model/position';
import type {
  BlockRangeSelection,
  EngineBlock,
  EngineDoc,
  NodeSelection,
  Pos,
  Selection,
  TextSelection,
} from '../model/types';
import type { Schema } from '../schema/types';
import { blockEnd, blockStart, firstRegion } from '../transform/block-edges';
import type { Assoc } from '../transform/step';

export function textSelection(anchor: Pos, head: Pos = anchor): TextSelection {
  return { kind: 'text', anchor, head };
}

export function nodeSelection(block: string): NodeSelection {
  return { kind: 'node', block };
}

export function blockRangeSelection(anchor: string, head: string = anchor): BlockRangeSelection {
  return { kind: 'blocks', anchor, head };
}

const samePos = (a: Pos, b: Pos) => a.block === b.block && a.region === b.region && a.offset === b.offset;

export function isCollapsed(selection: Selection | null): boolean {
  return selection?.kind === 'text' && samePos(selection.anchor, selection.head);
}

export function sameSelection(a: Selection | null, b: Selection | null): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  switch (a.kind) {
    case 'text':
      return b.kind === 'text' && samePos(a.anchor, b.anchor) && samePos(a.head, b.head);
    case 'node':
      return b.kind === 'node' && a.block === b.block;
    case 'blocks':
      return b.kind === 'blocks' && a.anchor === b.anchor && a.head === b.head;
  }
}

export function selectionRange(doc: EngineDoc, selection: Selection | null): { from: Pos; to: Pos } | null {
  return selection?.kind === 'text' ? orderedRange(doc, selection.anchor, selection.head) : null;
}

export function selectedBlockIds(doc: EngineDoc, selection: Selection | null): string[] {
  if (selection === null) return [];
  if (selection.kind === 'node') return [selection.block];
  const ends =
    selection.kind === 'text' ? [selection.anchor.block, selection.head.block] : [selection.anchor, selection.head];
  const [first, second] = ends.map((id) => requireBlockIndex(doc, id));
  return doc.blocks.slice(Math.min(first, second), Math.max(first, second) + 1).map((block) => block.id);
}

function isBackward(doc: EngineDoc, selection: TextSelection | BlockRangeSelection): boolean {
  if (selection.kind === 'text') {
    const { anchor, head } = selection;
    return doc.index.has(anchor.block) && doc.index.has(head.block) && comparePos(doc, anchor, head) > 0;
  }
  return (
    doc.index.has(selection.anchor) &&
    doc.index.has(selection.head) &&
    indexOfBlock(doc, selection.anchor) > indexOfBlock(doc, selection.head)
  );
}

const blockProbe = (block: string): Pos => ({ block, region: '', offset: 0 });

export function mapSelection(
  selection: Selection,
  map: (pos: Pos, assoc?: Assoc) => Pos,
  doc?: EngineDoc,
): Selection {
  if (selection.kind === 'node') {
    const block = map(blockProbe(selection.block), 1).block;
    return block === selection.block ? selection : nodeSelection(block);
  }
  const anchorAssoc: Assoc = doc !== undefined && isBackward(doc, selection) ? -1 : 1;
  if (selection.kind === 'blocks') {
    const anchor = map(blockProbe(selection.anchor), anchorAssoc).block;
    const head = map(blockProbe(selection.head), 1).block;
    return anchor === selection.anchor && head === selection.head ? selection : blockRangeSelection(anchor, head);
  }
  const anchor = map(selection.anchor, anchorAssoc);
  const head = map(selection.head, 1);
  return anchor === selection.anchor && head === selection.head ? selection : textSelection(anchor, head);
}

export function primaryRegion(schema: Schema, block: EngineBlock): string | null {
  const spec = specFor(schema, block.type);
  if (spec.flow === 'text' && spec.primaryRegion !== undefined && Object.hasOwn(block.regions, spec.primaryRegion)) {
    return spec.primaryRegion;
  }
  return firstRegion(block);
}

function edge(doc: EngineDoc, schema: Schema, blockId: string, atEnd: boolean): Selection {
  const block = doc.blocks[requireBlockIndex(doc, blockId)];
  const region = primaryRegion(schema, block);
  if (region === null) return nodeSelection(blockId);
  if (specFor(schema, block.type).flow !== 'text') return textSelection(atEnd ? blockEnd(block) : blockStart(block));
  return textSelection({ block: blockId, region, offset: atEnd ? inlineLength(block.regions[region]) : 0 });
}

export function startOf(doc: EngineDoc, schema: Schema, blockId: string): Selection {
  return edge(doc, schema, blockId, false);
}

export function endOf(doc: EngineDoc, schema: Schema, blockId: string): Selection {
  return edge(doc, schema, blockId, true);
}

export function defaultSelection(doc: EngineDoc, schema: Schema): Selection | null {
  return doc.blocks.length === 0 ? null : startOf(doc, schema, doc.blocks[0].id);
}

function validatePos(doc: EngineDoc, schema: Schema, pos: Pos): Pos | NodeSelection | null {
  const block = blockById(doc, pos.block);
  if (block === undefined) return null;
  if (!Object.hasOwn(block.regions, pos.region)) {
    const region = primaryRegion(schema, block);
    return region === null ? nodeSelection(block.id) : { block: block.id, region, offset: 0 };
  }
  const length = inlineLength(block.regions[pos.region]);
  return pos.offset >= 0 && pos.offset <= length ? pos : { ...pos, offset: Math.min(Math.max(pos.offset, 0), length) };
}

function validateText(doc: EngineDoc, schema: Schema, selection: TextSelection): Selection | null {
  const head = validatePos(doc, schema, selection.head);
  const anchor = validatePos(doc, schema, selection.anchor);
  if (head === null || anchor === null) return defaultSelection(doc, schema);
  if ('kind' in head) return head;
  if ('kind' in anchor) return anchor;
  return anchor === selection.anchor && head === selection.head ? selection : textSelection(anchor, head);
}

export function validateSelection(doc: EngineDoc, schema: Schema, selection: Selection | null): Selection | null {
  if (doc.blocks.length === 0) return null;
  if (selection === null) return defaultSelection(doc, schema);
  switch (selection.kind) {
    case 'node':
      return doc.index.has(selection.block) ? selection : defaultSelection(doc, schema);
    case 'blocks':
      return doc.index.has(selection.anchor) && doc.index.has(selection.head)
        ? selection
        : defaultSelection(doc, schema);
    case 'text':
      return validateText(doc, schema, selection);
  }
}
