import { describe, expect, it } from 'vitest';
import { createDoc } from '../model/doc';
import { atom, text } from '../model/inline';
import type { EngineBlock } from '../model/types';
import { setAttrsStep, setIndentStep } from './attrs-steps';
import { insertBlocksStep, moveBlocksStep, removeBlocksStep, replaceBlockStep } from './block-steps';
import { addMarkStep, removeMarkStep } from './mark-steps';
import { replaceInlineStep } from './replace-inline-step';
import { joinBlocksStep, splitBlockStep } from './split-join-steps';
import { created, divider, para, pos } from './step-fixtures';

const three = createDoc([para('a', 'one'), para('b', 'two'), para('c', 'three')]);
const callout = (id: string, body: string): EngineBlock => ({
  id,
  type: 'CALLOUT',
  indent: 0,
  attrs: { tone: 'info' },
  regions: { body: [text(body)] },
});

describe('position mapping for inline replacement', () => {
  const doc = createDoc([{ ...para('a', 'hello'), regions: { text: [text('hello')], note: [text('memo')] } }]);

  it('maps the boundaries of a replaced range by assoc', () => {
    const { map } = replaceInlineStep('a', 'text', 1, 3, [text('EY')]).apply(doc);
    expect(map(pos('a', 1), -1)).toEqual(pos('a', 1));
    expect(map(pos('a', 1), 1)).toEqual(pos('a', 3));
    expect(map(pos('a', 3), -1)).toEqual(pos('a', 1));
    expect(map(pos('a', 3), 1)).toEqual(pos('a', 3));
  });

  it('shifts positions after a deletion and counts an atom as one', () => {
    const deletion = replaceInlineStep('a', 'text', 1, 3, []).apply(doc);
    expect(deletion.map(pos('a', 4))).toEqual(pos('a', 2));
    const insertion = replaceInlineStep('a', 'text', 1, 1, [atom('mention', { id: '1' })]).apply(doc);
    expect(insertion.map(pos('a', 4))).toEqual(pos('a', 5));
  });

  it('leaves other regions of the same block alone', () => {
    const { map } = replaceInlineStep('a', 'text', 0, 5, []).apply(doc);
    expect(map(pos('a', 3, 'note'))).toEqual(pos('a', 3, 'note'));
  });
});

describe('position mapping that does not move anything', () => {
  it.each([
    ['addMark', addMarkStep('a', 'text', 0, 2, { type: 'bold' })],
    ['removeMark', removeMarkStep('a', 'text', 0, 2, 'bold')],
    ['setAttrs', setAttrsStep('a', { kind: 'quote' })],
    ['setIndent', setIndentStep('a', 1)],
    ['insertBlocks', insertBlocksStep(0, [para('n', 'new')])],
    ['moveBlocks', moveBlocksStep(0, 1, 2)],
  ])('%s maps every position to itself', (_name, step) => {
    const { map } = step.apply(three);
    const at = pos('a', 2);
    expect(map(at)).toBe(at);
    expect(map(at, -1)).toBe(at);
  });
});

describe('position mapping for removed blocks', () => {
  it('maps to the end of the block before for assoc -1 and the start of the block after for assoc 1', () => {
    const { map } = removeBlocksStep(1, 1).apply(three);
    expect(map(pos('b', 2), -1)).toEqual(pos('a', 3));
    expect(map(pos('b', 2), 1)).toEqual(pos('c', 0));
    expect(map(pos('b', 2))).toEqual(pos('c', 0));
  });

  it('falls back to the other side when there is no neighbour on the preferred one', () => {
    const first = removeBlocksStep(0, 1).apply(three).map;
    expect(first(pos('a', 1), -1)).toEqual(pos('b', 0));
    expect(first(pos('a', 1), 1)).toEqual(pos('b', 0));
    const last = removeBlocksStep(2, 1).apply(three).map;
    expect(last(pos('c', 1), -1)).toEqual(pos('b', 3));
    expect(last(pos('c', 1), 1)).toEqual(pos('b', 3));
  });

  it('uses the nearest survivors around a run of removed blocks', () => {
    const { map } = removeBlocksStep(1, 2).apply(createDoc([...three.blocks, para('d', 'four')]));
    expect(map(pos('c', 1), -1)).toEqual(pos('a', 3));
    expect(map(pos('b', 1), 1)).toEqual(pos('d', 0));
  });

  it('returns the position unchanged when nothing survives', () => {
    const { map } = removeBlocksStep(0, 3).apply(three);
    const at = pos('b', 1);
    expect(map(at)).toBe(at);
    expect(map(at, -1)).toBe(at);
  });

  it('keeps positions in surviving blocks', () => {
    const { map } = removeBlocksStep(1, 1).apply(three);
    const at = pos('c', 4);
    expect(map(at)).toBe(at);
  });

  it('uses the first region of the neighbour, whatever its name', () => {
    const { map } = removeBlocksStep(1, 1).apply(createDoc([callout('k', 'abcd'), para('b', 'x')]));
    expect(map(pos('b', 1), -1)).toEqual(pos('k', 4, 'body'));
  });

  it('points at an empty region name when the neighbour has no regions', () => {
    const before = removeBlocksStep(1, 1).apply(createDoc([divider('d'), para('b', 'x')])).map;
    expect(before(pos('b', 1), -1)).toEqual({ block: 'd', region: '', offset: 0 });
    const after = removeBlocksStep(0, 1).apply(createDoc([para('a', 'x'), divider('d')])).map;
    expect(after(pos('a', 1), 1)).toEqual({ block: 'd', region: '', offset: 0 });
    expect(after(pos('a', 1), -1)).toEqual({ block: 'd', region: '', offset: 0 });
  });
});

describe('position mapping for a replaced block', () => {
  const doc = createDoc([para('a', 'hello'), para('b', 'x')]);

  it('keeps positions in a surviving region and clamps the offset', () => {
    const { map } = replaceBlockStep(para('a', 'hi')).apply(doc);
    expect(map(pos('a', 1))).toEqual(pos('a', 1));
    expect(map(pos('a', 4))).toEqual(pos('a', 2));
    expect(map(pos('b', 1))).toEqual(pos('b', 1));
  });

  it('moves to the start of the first region when the region is gone', () => {
    const { map } = replaceBlockStep(callout('a', 'abc')).apply(doc);
    expect(map(pos('a', 3))).toEqual(pos('a', 0, 'body'));
  });

  it('moves to an empty region name when the block has no regions left', () => {
    const { map } = replaceBlockStep(divider('a')).apply(doc);
    expect(map(pos('a', 3))).toEqual({ block: 'a', region: '', offset: 0 });
  });
});

describe('position mapping for splits', () => {
  const doc = createDoc([{ ...para('a', 'hello'), regions: { text: [text('hello')], note: [text('memo')] } }]);

  it('moves the tail into the region named by the created block', () => {
    const { map } = splitBlockStep('a', 'text', 2, created('c', { region: 'body' })).apply(doc);
    expect(map(pos('a', 1))).toEqual(pos('a', 1));
    expect(map(pos('a', 2), -1)).toEqual(pos('a', 2));
    expect(map(pos('a', 2), 1)).toEqual(pos('c', 0, 'body'));
    expect(map(pos('a', 5))).toEqual(pos('c', 3, 'body'));
    expect(map(pos('a', 3, 'note'))).toEqual(pos('a', 3, 'note'));
  });

  it('builds the created block from its description and the tail', () => {
    const marked = createDoc([para('a', '', { regions: { text: [text('ab', [{ type: 'bold' }]), text('cd')] } })]);
    const step = splitBlockStep(
      'a',
      'text',
      3,
      created('c', { type: 'TOGGLE', attrs: { open: true }, indent: 2, regions: { note: [text('n')] } }),
    );
    const next = step.apply(marked).doc;
    expect(next.blocks[0].regions.text).toEqual([text('ab', [{ type: 'bold' }]), text('c')]);
    expect(next.blocks[1]).toEqual({
      id: 'c',
      type: 'TOGGLE',
      attrs: { open: true },
      indent: 2,
      regions: { note: [text('n')], text: [text('d')] },
    });
  });
});

describe('position mapping for joins', () => {
  const doc = createDoc([
    para('a', 'ab'),
    { ...callout('b', 'cd'), regions: { body: [text('cd')], note: [text('memo')] } },
  ]);
  const { map } = joinBlocksStep('a', 'text', 'b', 'body').apply(doc);

  it('maps the joined region after the target text and other regions to the join point', () => {
    expect(map(pos('b', 1, 'body'))).toEqual(pos('a', 3));
    expect(map(pos('b', 3, 'note'))).toEqual(pos('a', 2));
    expect(map(pos('b', 0, ''))).toEqual(pos('a', 2));
  });

  it('keeps positions in the target', () => {
    const at = pos('a', 1);
    expect(map(at)).toBe(at);
  });
});
