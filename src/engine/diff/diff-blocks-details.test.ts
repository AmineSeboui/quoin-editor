import { describe, expect, it } from 'vitest';
import { text } from '../model/inline';
import type { QuoinBlock } from '../model/quoin-block';
import { createSchema } from '../schema/create-schema';
import type { BlockSpec } from '../schema/types';
import { diffBlocks, type BlockDiff } from './diff-blocks';

const md = (id: string, markdown: string, indent?: number): QuoinBlock => ({
  id,
  type: 'MARKDOWN',
  data: { markdown },
  ...(indent === undefined ? {} : { indent }),
});
const table = (id: string, rows: string[][], extra: Record<string, unknown> = {}): QuoinBlock => ({
  id,
  type: 'TABLE',
  data: { rows, header: true, ...extra },
});
const ops = (diff: readonly BlockDiff[]) => diff.map((d) => d.op);
const only = <Op extends BlockDiff['op']>(d: BlockDiff, op: Op) => {
  expect(d.op).toBe(op);
  return d as Extract<BlockDiff, { op: Op }>;
};

describe('diffBlocks alignment by id', () => {
  it('returns nothing for two empty documents and inserts or deletes whole documents', () => {
    expect(diffBlocks([], [])).toEqual([]);
    expect(diffBlocks([], [md('a', 'x')])).toEqual([{ op: 'insert', block: md('a', 'x') }]);
    expect(diffBlocks([md('a', 'x')], [])).toEqual([{ op: 'delete', block: md('a', 'x') }]);
  });

  it('reports equal for blocks with the same content in different objects', () => {
    const diff = diffBlocks([md('a', 'x'), table('t', [['1']])], [md('a', 'x'), table('t', [['1']])]);
    expect(diff).toEqual([
      { op: 'equal', block: md('a', 'x') },
      { op: 'equal', block: table('t', [['1']]) },
    ]);
  });

  it('treats a missing indent as zero', () => {
    expect(ops(diffBlocks([md('a', 'x')], [md('a', 'x', 0)]))).toEqual(['equal']);
  });

  it('treats a key holding undefined as absent', () => {
    const before: QuoinBlock = { id: 'a', type: 'MARKDOWN', data: { markdown: 'x', align: undefined } };
    expect(ops(diffBlocks([before], [md('a', 'x')]))).toEqual(['equal']);
  });

  it('reports an indent change as an attribute change with unchanged text', () => {
    const [d] = diffBlocks([md('a', '- x')], [md('a', '- x', 1)]);
    const change = only(d, 'change');
    expect(change.attrsChanged).toBe(true);
    expect(change.regions.text).toEqual([{ op: 'equal', inline: [text('x')] }]);
  });

  it('reports a type change as an attribute change', () => {
    const callout: QuoinBlock = { id: 'a', type: 'CALLOUT', data: { markdown: 'x' } };
    expect(only(diffBlocks([md('a', 'x')], [callout])[0], 'change').attrsChanged).toBe(true);
  });

  it('reports a text edit that keeps the line kind as a change without attribute changes', () => {
    const [d] = diffBlocks([md('a', '## One')], [md('a', '## Two')]);
    expect(only(d, 'change')).toMatchObject({ attrsChanged: false });
  });

  it('keeps a markdown spelling change as a change whose text is equal', () => {
    const [d] = diffBlocks([md('a', '*x*')], [md('a', '_x_')]);
    const change = only(d, 'change');
    expect(change.regions.text.every((c) => c.op === 'equal')).toBe(true);
    expect(change.attrsChanged).toBe(false);
  });

  it('compares data of unknown block types deeply and reports no regions', () => {
    const custom = (config: unknown): QuoinBlock => ({ id: 'c', type: 'CUSTOM', data: { config } });
    expect(ops(diffBlocks([custom({ a: [1, { b: 2 }] })], [custom({ a: [1, { b: 2 }] })]))).toEqual(['equal']);
    const change = only(diffBlocks([custom({ a: [1, { b: 2 }] })], [custom({ a: [1, { b: 3 }] })])[0], 'change');
    expect(change.regions).toEqual({});
    expect(change.attrsChanged).toBe(true);
  });

  it('tells arrays from objects and lengths apart', () => {
    const custom = (value: unknown): QuoinBlock => ({ id: 'c', type: 'CUSTOM', data: { value } });
    expect(ops(diffBlocks([custom([])], [custom({})]))).toEqual(['change']);
    expect(ops(diffBlocks([custom([1])], [custom([1, 2])]))).toEqual(['change']);
    expect(ops(diffBlocks([custom(null)], [custom({})]))).toEqual(['change']);
  });

  it('keeps blocks in document order with deletions before insertions', () => {
    const diff = diffBlocks([md('a', '1'), md('b', '2'), md('c', '3')], [md('a', '1'), md('x', '9'), md('c', '3')]);
    expect(diff).toEqual([
      { op: 'equal', block: md('a', '1') },
      { op: 'delete', block: md('b', '2') },
      { op: 'insert', block: md('x', '9') },
      { op: 'equal', block: md('c', '3') },
    ]);
  });
});

describe('diffBlocks moved blocks', () => {
  it('flags only the moved id, on both its delete and its insert', () => {
    const diff = diffBlocks([md('a', '1'), md('b', '2'), md('c', '3')], [md('b', '2'), md('c', '3'), md('a', '1')]);
    expect(diff).toEqual([
      { op: 'delete', block: md('a', '1'), moved: true },
      { op: 'equal', block: md('b', '2') },
      { op: 'equal', block: md('c', '3') },
      { op: 'insert', block: md('a', '1'), moved: true },
    ]);
  });

  it('leaves the flag off for ids that exist on one side only', () => {
    const diff = diffBlocks([md('a', '1'), md('b', '2')], [md('b', '2'), md('c', '3')]);
    expect(diff.filter((d) => 'moved' in d)).toEqual([]);
  });

  it('carries the old block on the delete and the new block on the insert of an edited move', () => {
    const diff = diffBlocks([md('a', 'old'), md('b', '2')], [md('b', '2'), md('a', 'new')]);
    expect(diff).toEqual([
      { op: 'delete', block: md('a', 'old'), moved: true },
      { op: 'equal', block: md('b', '2') },
      { op: 'insert', block: md('a', 'new'), moved: true },
    ]);
  });

  it('does not flag a duplicated id as moved when only one side repeats it', () => {
    const diff = diffBlocks([md('a', '1'), md('a', '1')], [md('a', '1')]);
    expect(diff).toEqual([
      { op: 'equal', block: md('a', '1') },
      { op: 'delete', block: md('a', '1') },
    ]);
  });
});

describe('diffBlocks alignment by content', () => {
  const regenerated = (prefix: string, contents: string[]) => contents.map((c, i) => md(`${prefix}${i}`, c));

  it('matches blocks with new ids by content and reports the newer block', () => {
    const diff = diffBlocks(regenerated('a', ['one', 'two', 'three']), regenerated('b', ['one', 'two', 'three']));
    expect(diff).toEqual(regenerated('b', ['one', 'two', 'three']).map((block) => ({ op: 'equal', block })));
  });

  it('reports an edited block of an id-less document as a deletion and an insertion', () => {
    const diff = diffBlocks(regenerated('a', ['one', 'two', 'three']), regenerated('b', ['one', 'TWO', 'three']));
    expect(diff).toEqual([
      { op: 'equal', block: md('b0', 'one') },
      { op: 'delete', block: md('a1', 'two') },
      { op: 'insert', block: md('b1', 'TWO') },
      { op: 'equal', block: md('b2', 'three') },
    ]);
  });

  it('never flags a move by content', () => {
    const diff = diffBlocks(regenerated('a', ['one', 'two']), regenerated('b', ['two', 'one']));
    expect(diff.filter((d) => 'moved' in d)).toEqual([]);
  });

  it('keeps aligning by id when exactly half of the ids match', () => {
    const a = [md('a', '1'), md('b', '2'), md('c', '3'), md('d', '4')];
    const b = [md('a', '1'), md('b', '2'), md('x', '3'), md('y', '4')];
    expect(ops(diffBlocks(a, b))).toEqual(['equal', 'equal', 'delete', 'delete', 'insert', 'insert']);
  });

  it('falls back to content when fewer than half of the ids match', () => {
    const a = [md('a', '1'), md('b', '2'), md('c', '3'), md('d', '4')];
    const b = [md('a', '1'), md('q', '2'), md('x', '3'), md('y', '4')];
    expect(ops(diffBlocks(a, b))).toEqual(['equal', 'equal', 'equal', 'equal']);
  });

  it('measures the share against the shorter document, so added blocks do not hide stable ids', () => {
    const a = [md('a', 'old')];
    const b = [md('a', 'new'), md('x', '2'), md('y', '3')];
    expect(ops(diffBlocks(a, b))).toEqual(['change', 'insert', 'insert']);
  });
});

describe('diffBlocks regions', () => {
  it('diffs table cells one by one in reading order and keeps unchanged cells as equal', () => {
    const [d] = diffBlocks(
      [table('t', [['a', 'b'], ['c', 'd']])],
      [table('t', [['a', 'b'], ['c', 'changed']])],
    );
    const change = only(d, 'change');
    expect(Object.keys(change.regions)).toEqual(['cell:0:0', 'cell:0:1', 'cell:1:0', 'cell:1:1']);
    expect(change.regions['cell:0:0']).toEqual([{ op: 'equal', inline: [text('a')] }]);
    expect(change.regions['cell:1:1']).toEqual([
      { op: 'delete', inline: [text('d')] },
      { op: 'insert', inline: [text('changed')] },
    ]);
    expect(change.attrsChanged).toBe(false);
  });

  it('lists the cells of an added column in reading order, sorted by number', () => {
    const before = table('t', [['a'], ['b']]);
    const row = (prefix: string) => Array.from({ length: 11 }, (_, i) => `${prefix}${i}`);
    const after = table('t', [row('a'), row('b')]);
    const names = Object.keys(only(diffBlocks([before], [after])[0], 'change').regions);
    expect(names).toEqual([
      ...Array.from({ length: 11 }, (_, i) => `cell:0:${i}`),
      ...Array.from({ length: 11 }, (_, i) => `cell:1:${i}`),
    ]);
  });

  it('reports the cells of an added row as insertions and flags the row count', () => {
    const change = only(diffBlocks([table('t', [['a']])], [table('t', [['a'], ['b']])])[0], 'change');
    expect(change.regions['cell:1:0']).toEqual([{ op: 'insert', inline: [text('b')] }]);
    expect(change.attrsChanged).toBe(true);
  });

  it('reports the cells of a removed row as deletions', () => {
    const change = only(diffBlocks([table('t', [['a'], ['b']])], [table('t', [['a']])])[0], 'change');
    expect(change.regions['cell:1:0']).toEqual([{ op: 'delete', inline: [text('b')] }]);
  });

  it('sees a table attribute change without text changes', () => {
    const change = only(
      diffBlocks([table('t', [['a']], { align: ['left'] })], [table('t', [['a']], { align: ['right'] })])[0],
      'change',
    );
    expect(change.attrsChanged).toBe(true);
    expect(change.regions['cell:0:0']).toEqual([{ op: 'equal', inline: [text('a')] }]);
  });

  it('diffs a legacy block with several lines as one block', () => {
    const [d] = diffBlocks([md('a', '# Title\n\nbody one')], [md('a', '# Title\n\nbody two')]);
    const change = only(d, 'change');
    expect(change.regions.text.map((c) => c.op)).toEqual(['equal', 'delete', 'insert']);
    expect(change.attrsChanged).toBe(false);
  });

  it('reads the regions of a block type from the given schema', () => {
    const note: BlockSpec = {
      type: 'NOTE',
      flow: 'text',
      primaryRegion: 'body',
      fromData: (data, ctx) => ({ attrs: {}, regions: { body: ctx.inline.parse(String(data.body)) } }),
      toData: () => ({}),
      initial: () => ({ attrs: {}, regions: { body: [] } }),
    };
    const block = (body: string): QuoinBlock => ({ id: 'n', type: 'NOTE', data: { body } });
    const [d] = diffBlocks([block('old')], [block('new')], { schema: createSchema({ blocks: [note] }) });
    expect(only(d, 'change').regions.body.map((c) => c.op)).toEqual(['delete', 'insert']);
    expect(only(diffBlocks([block('old')], [block('new')])[0], 'change').regions).toEqual({});
  });
});

describe('diffBlocks purity and size', () => {
  it('does not change its inputs', () => {
    const freeze = <T>(value: T): T => {
      if (typeof value === 'object' && value !== null) Object.values(value).forEach(freeze);
      return Object.freeze(value);
    };
    const a = freeze([md('a', 'x'), table('t', [['1']]), md('c', 'gone')]);
    const b = freeze([table('t', [['2']]), md('a', 'y')]);
    expect(() => diffBlocks(a, b)).not.toThrow();
  });

  it('finds a single edit among thousands of blocks', () => {
    const doc = Array.from({ length: 4000 }, (_, i) => md(`b${i}`, `block ${i}`));
    const edited = doc.map((block) => (block.id === 'b2500' ? md('b2500', 'block edited') : block));
    const diff = diffBlocks(doc, edited);
    expect(diff.filter((d) => d.op !== 'equal')).toHaveLength(1);
    expect(diff).toHaveLength(4000);
  });
});
