import { specFor } from '../blocks/unknown-spec';
import { blockById } from '../model/doc';
import { inlineLength, inlineText, text } from '../model/inline';
import type { BlockAttrs, EngineBlock, Inline, Pos } from '../model/types';
import type { Schema } from '../schema/types';
import { endOf, primaryRegion, selectedBlockIds, textSelection } from '../state/selection';
import { Transaction } from '../state/transaction';
import { patchChangesAttrs, setAttrsStep, type AttrsPatch } from '../transform/attrs-steps';
import { replaceBlockStep } from '../transform/block-steps';
import { createBlock, isTextFlow, withContent } from './block-helpers';
import type { Command } from './command';

// Void blocks whose editable text lives in an attribute.
const TEXT_ATTRIBUTE: ReadonlyMap<string, string> = new Map([
  ['CODE', 'code'],
  ['MATH', 'latex'],
]);

function holdsText(schema: Schema, type: string): boolean {
  return TEXT_ATTRIBUTE.has(type) || specFor(schema, type).flow === 'text';
}

function sourceContent(schema: Schema, block: EngineBlock): Inline {
  const field = TEXT_ATTRIBUTE.get(block.type);
  if (field !== undefined) {
    const value = block.attrs[field];
    return typeof value === 'string' && value !== '' ? [text(value)] : [];
  }
  const region = primaryRegion(schema, block);
  return region === null ? [] : block.regions[region];
}

function plainText(schema: Schema, content: Inline): string {
  return inlineText(content, (node) => schema.atoms.get(node.type)?.plainText(node.attrs) ?? '');
}

function convert(schema: Schema, block: EngineBlock, type: string, attrs: BlockAttrs): EngineBlock {
  const content = sourceContent(schema, block);
  const field = TEXT_ATTRIBUTE.get(type);
  const withText = field === undefined ? attrs : { ...attrs, [field]: plainText(schema, content) };
  const created = createBlock(schema, type, withText, block.indent, block.id);
  return field === undefined ? withContent(schema, created, content) : created;
}

function sameTypePatch(type: string, attrs: BlockAttrs): AttrsPatch {
  if (type !== 'MARKDOWN') return attrs;
  return { kind: 'paragraph', level: undefined, checked: undefined, start: undefined, ...attrs };
}

export function setBlockType(type: string, attrs: BlockAttrs = {}): Command {
  return (state, dispatch) => {
    const { doc, schema, selection } = state;
    if (!holdsText(schema, type)) return false;
    const ids = selectedBlockIds(doc, selection);
    const convertible = (block: EngineBlock) =>
      isTextFlow(schema, block) || (selection?.kind === 'node' && TEXT_ATTRIBUTE.has(block.type));
    const blocks = ids.flatMap((id) => blockById(doc, id) ?? []).filter(convertible);
    if (blocks.length === 0) return false;

    const tr = new Transaction(state);
    const moved = new Map<string, { from: string; to: string; length: number }>();
    for (const block of blocks) {
      if (block.type === type) {
        const patch = sameTypePatch(type, attrs);
        if (patchChangesAttrs(block.attrs, patch)) tr.step(setAttrsStep(block.id, patch));
        continue;
      }
      const next = convert(schema, block, type, attrs);
      tr.step(replaceBlockStep(next));
      const from = primaryRegion(schema, block);
      const to = primaryRegion(schema, next);
      if (from !== null && to !== null) moved.set(block.id, { from, to, length: inlineLength(next.regions[to]) });
    }
    if (!tr.docChanged) return false;
    if (selection?.kind === 'text' && moved.size > 0) {
      const carry = (pos: Pos): Pos => {
        const entry = moved.get(pos.block);
        if (entry === undefined || pos.region !== entry.from) return pos;
        return { block: pos.block, region: entry.to, offset: Math.min(pos.offset, entry.length) };
      };
      tr.setSelection(textSelection(carry(selection.anchor), carry(selection.head)));
    }
    const converted = selection?.kind === 'node' ? blockById(tr.doc, selection.block) : undefined;
    if (converted !== undefined && isTextFlow(schema, converted)) tr.setSelection(endOf(tr.doc, schema, converted.id));
    dispatch?.(tr);
    return true;
  };
}
