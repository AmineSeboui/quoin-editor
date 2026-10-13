import { requireBlockIndex } from '../model/doc';
import { inlineText, sliceInline } from '../model/inline';
import type { EngineBlock, Pos } from '../model/types';
import type { Schema } from '../schema/types';
import { primaryRegion, startOf, textSelection } from '../state/selection';
import type { Transaction } from '../state/transaction';
import { setIndentStep } from '../transform/attrs-steps';
import { insertBlocksStep } from '../transform/block-steps';
import { replaceInlineStep } from '../transform/replace-inline-step';
import { splitBlockStep } from '../transform/split-join-steps';
import { createBlock, descendantsEnd, isItem, isTextFlow, regionLength, specOf, withContent } from './block-helpers';
import { insertTextAt } from './insert-text-at';
import { paragraphStep } from './paragraph-step';

type Target = { tr: Transaction; schema: Schema; block: EngineBlock; index: number; pos: Pos; makeId: () => string };

function enterInHardBreakBlock({ tr, schema, block, index, pos, makeId }: Target): void {
  const length = regionLength(block, pos.region);
  if (pos.offset === length && inlineText(block.regions[pos.region]).endsWith('\n')) {
    tr.step(replaceInlineStep(block.id, pos.region, length - 1, length, []));
    const paragraph = createBlock(schema, schema.defaultTextBlock, {}, block.indent, makeId());
    tr.step(insertBlocksStep(descendantsEnd(tr.doc, index), [paragraph]));
    tr.setSelection(startOf(tr.doc, schema, paragraph.id));
  } else {
    tr.setSelection(textSelection(insertTextAt(tr, schema, pos, '\n')));
  }
}

function leaveItem({ tr, schema, block, pos }: Target): void {
  tr.step(block.indent > 0 ? setIndentStep(block.id, block.indent - 1) : paragraphStep(schema, block, pos.region));
  tr.setSelection(startOf(tr.doc, schema, block.id));
}

function insertEmptyBefore({ tr, schema, block, index, pos, makeId }: Target): void {
  const next = specOf(schema, block).splitAttrs?.(block.attrs);
  const empty = createBlock(schema, next?.type ?? schema.defaultTextBlock, next?.attrs, block.indent, makeId());
  tr.step(insertBlocksStep(index, [empty]));
  tr.setSelection(textSelection(pos));
}

function splitToggle({ tr, schema, block, index, pos, makeId }: Target): void {
  const length = regionLength(block, pos.region);
  const open = block.attrs.open === true;
  const tail = sliceInline(block.regions[pos.region], pos.offset, length);
  const empty = createBlock(schema, schema.defaultTextBlock, {}, open ? block.indent + 1 : block.indent, makeId());
  if (pos.offset < length) tr.step(replaceInlineStep(block.id, pos.region, pos.offset, length, []));
  tr.step(insertBlocksStep(open ? index + 1 : descendantsEnd(tr.doc, index), [withContent(schema, empty, tail)]));
  tr.setSelection(startOf(tr.doc, schema, empty.id));
}

function splitInTwo({ tr, schema, block, pos, makeId }: Target): void {
  const next = specOf(schema, block).splitAttrs?.(block.attrs) ?? { type: block.type, attrs: block.attrs };
  const created = createBlock(schema, next.type, next.attrs, block.indent, makeId());
  const region = primaryRegion(schema, created) ?? '';
  const { id, type, attrs, indent, regions } = created;
  tr.step(splitBlockStep(block.id, pos.region, pos.offset, { id, type, attrs, indent, region, regions }));
  tr.setSelection(textSelection({ block: id, region, offset: 0 }));
}

export function splitAt(tr: Transaction, schema: Schema, pos: Pos, collapsed: boolean, makeId: () => string): boolean {
  const index = requireBlockIndex(tr.doc, pos.block);
  const block = tr.doc.blocks[index];
  if (!isTextFlow(schema, block) || pos.region !== primaryRegion(schema, block)) return false;
  const target: Target = { tr, schema, block, index, pos, makeId };
  const length = regionLength(block, pos.region);
  if (specOf(schema, block).enter === 'hardBreak') enterInHardBreakBlock(target);
  else if (collapsed && length === 0 && isItem(block)) leaveItem(target);
  else if (pos.offset === 0 && length > 0) insertEmptyBefore(target);
  else if (block.type === 'TOGGLE') splitToggle(target);
  else splitInTwo(target);
  return true;
}
