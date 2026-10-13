import { createBlock, withContent } from '../commands/block-helpers';
import { setBlockType } from '../commands/turn-into';
import { requireBlockIndex } from '../model/doc';
import { inlineLength, sliceInline } from '../model/inline';
import { newId } from '../model/new-id';
import type { BlockAttrs } from '../model/types';
import { startOf } from '../state/selection';
import { Transaction } from '../state/transaction';
import { insertBlocksStep, replaceBlockStep } from '../transform/block-steps';
import { convertPrefix } from './convert-prefix';
import type { InputRule } from './input-rule';

const PARAGRAPH = ['paragraph'];

function lineRule(
  name: string,
  match: RegExp,
  attrs: (match: RegExpExecArray) => BlockAttrs,
  kinds: readonly string[] = PARAGRAPH,
): InputRule {
  return {
    name,
    match,
    blockTypes: ['MARKDOWN'],
    kinds,
    handler: (state, found, range) => convertPrefix(state, range, setBlockType('MARKDOWN', attrs(found))),
  };
}

const divider: InputRule = {
  name: 'divider',
  match: /^(?:---|[\u2013\u2014]-|\*\*\*|___)$/,
  blockTypes: ['MARKDOWN'],
  kinds: PARAGRAPH,
  handler(state, _match, range, context) {
    const { doc, schema } = state;
    const index = requireBlockIndex(doc, range.block);
    const block = doc.blocks[index];
    const content = block.regions[range.region];
    const tail = sliceInline(content, range.to, inlineLength(content));
    const empty = createBlock(schema, schema.defaultTextBlock, {}, block.indent, (context?.newId ?? newId)());
    const next = withContent(schema, empty, tail);
    const tr = new Transaction(state);
    tr.step(replaceBlockStep(createBlock(schema, 'DIVIDER', {}, block.indent, block.id)));
    tr.step(insertBlocksStep(index + 1, [next]));
    return tr.setSelection(startOf(tr.doc, schema, next.id));
  },
};

export const blockInputRules: readonly InputRule[] = [
  lineRule('heading', /^(#{1,6}) $/, (m) => ({ kind: 'heading', level: m[1].length })),
  lineRule('bullet', /^[-*+] $/, () => ({ kind: 'bullet' })),
  lineRule('ordered', /^(\d{1,9})[.)] $/, (m) => ({ kind: 'ordered', start: Number(m[1]) })),
  lineRule('task', /^\[( |x|X)?\] $/, (m) => ({ kind: 'task', checked: m[1] === 'x' || m[1] === 'X' }), [
    'paragraph',
    'bullet',
  ]),
  lineRule('quote', /^> $/, () => ({ kind: 'quote' })),
  divider,
  {
    name: 'math',
    match: /^\$\$ $/,
    blockTypes: ['MARKDOWN'],
    kinds: PARAGRAPH,
    handler: (state, _match, range) => convertPrefix(state, range, setBlockType('MATH')),
  },
  {
    name: 'code',
    match: /^```([\w+#.-]*) $/,
    blockTypes: ['MARKDOWN'],
    kinds: PARAGRAPH,
    handler: (state, found, range) => convertPrefix(state, range, setBlockType('CODE', { language: found[1] })),
  },
];
