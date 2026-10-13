import { describe, expect, it } from 'vitest';
import { createEditor } from '../extension/editor';
import { text } from '../model/inline';
import type { QuoinBlock } from '../model/quoin-block';
import { textSelection } from '../state/selection';
import { diffBlocks, type BlockDiff } from './diff-blocks';

const md = (id: string, markdown: string, indent?: number): QuoinBlock => ({
  id,
  type: 'MARKDOWN',
  data: { markdown },
  ...(indent === undefined ? {} : { indent }),
});
const ops = (diff: readonly BlockDiff[]) => diff.map((d) => d.op);
const change = (d: BlockDiff) => {
  expect(d.op).toBe('change');
  return d as Extract<BlockDiff, { op: 'change' }>;
};

const plain = (inline: readonly { kind: string; text?: string }[]) => inline.map((node) => node.text ?? '').join('');

const LEGACY = 'First paragraph.\n\n- item one\n- item two\n\nLast paragraph here.';

describe('diffBlocks of an upgraded 0.4 document', () => {
  it('shows one word typed into the last piece of a legacy block as one word-level change', () => {
    const legacy = [md('x', LEGACY), md('y', 'untouched')];
    const editor = createEditor({ blocks: legacy, isMac: true });
    const last = editor.state.doc.blocks[3];
    editor.commands.setSelection(textSelection({ block: last.id, region: 'text', offset: 4 }));
    editor.insertText(' quick');
    const diff = diffBlocks(legacy, editor.getBlocks());
    expect(ops(diff)).toEqual(['equal', 'equal', 'equal', 'change', 'equal']);
    const edits = change(diff[3]).regions.text.filter((c) => c.op !== 'equal');
    expect(edits).toHaveLength(1);
    expect(edits[0].op).toBe('insert');
    expect(plain(edits[0].inline)).toContain('quick');
  });

  it('diffs a legacy block stored whole on both sides piece by piece', () => {
    const before = [md('x', LEGACY), md('y', 'untouched')];
    const after = [md('x', LEGACY.replace('Last', 'Final')), md('y', 'untouched')];
    const diff = diffBlocks(before, after);
    expect(ops(diff)).toEqual(['equal', 'equal', 'equal', 'change', 'equal']);
    expect(change(diff[3]).regions.text.map((c) => c.op)).toEqual(['delete', 'insert', 'equal']);
  });

  it('keeps an untouched legacy block as one equal block', () => {
    const doc = [md('x', LEGACY), md('y', 'untouched')];
    const diff = diffBlocks(doc, [md('x', LEGACY), md('y', 'untouched')]);
    expect(diff).toEqual([
      { op: 'equal', block: md('x', LEGACY) },
      { op: 'equal', block: md('y', 'untouched') },
    ]);
  });

  it('reports a piece removed from a legacy block as one deletion', () => {
    const before = [md('x', LEGACY)];
    const after = [md('x', 'First paragraph.'), md('x-2', '- item one'), md('x-4', 'Last paragraph here.')];
    const diff = diffBlocks(before, after);
    expect(ops(diff)).toEqual(['equal', 'equal', 'delete', 'equal']);
    expect((diff[2] as Extract<BlockDiff, { op: 'delete' }>).block.id).toBe('x-3');
  });

  it('reads the pieces of an edited legacy block that sits among other blocks', () => {
    const before = [md('a', 'alpha'), md('x', 'one\n\ntwo words'), md('z', 'omega')];
    const after = [md('a', 'alpha'), md('x', 'one\n\ntwo wordz'), md('z', 'omega')];
    expect(ops(diffBlocks(before, after))).toEqual(['equal', 'equal', 'change', 'equal']);
  });

  it('does not change its inputs', () => {
    const freeze = <T>(value: T): T => {
      if (typeof value === 'object' && value !== null) Object.values(value).forEach(freeze);
      return Object.freeze(value);
    };
    const before = freeze([md('x', LEGACY)]);
    const after = freeze([md('x', LEGACY.replace('Last', 'Final'))]);
    expect(() => diffBlocks(before, after)).not.toThrow();
  });
});

describe('diffBlocks pairing of leftover runs', () => {
  const regenerated = (prefix: string, contents: string[]) => contents.map((c, i) => md(`${prefix}${i}`, c));

  it('shows one edited word of an id-less document as a change, not a deletion and an insertion', () => {
    const diff = diffBlocks(regenerated('a', ['one', 'two words']), regenerated('b', ['one', 'two wordz']));
    expect(ops(diff)).toEqual(['equal', 'change']);
    const pair = change(diff[1]);
    expect(pair.before.id).toBe('a1');
    expect(pair.after.id).toBe('b1');
    expect(pair.regions.text).toEqual([
      { op: 'equal', inline: [text('two ')] },
      { op: 'delete', inline: [text('words')] },
      { op: 'insert', inline: [text('wordz')] },
    ]);
  });

  it('still shows a replaced block as a deletion and an insertion', () => {
    const diff = diffBlocks(regenerated('a', ['one', 'two words']), regenerated('b', ['one', 'completely different']));
    expect(ops(diff)).toEqual(['equal', 'delete', 'insert']);
  });

  it('pairs several edited blocks in document order and leaves the rest alone', () => {
    const before = regenerated('a', ['keep', 'red apple pie', 'gone entirely', 'green tea cup', 'end']);
    const after = regenerated('b', ['keep', 'red apple tart', 'green tea mug', 'brand new text', 'end']);
    const diff = diffBlocks(before, after);
    expect(ops(diff)).toEqual(['equal', 'change', 'delete', 'change', 'insert', 'equal']);
    expect(change(diff[1]).before.id).toBe('a1');
    expect(change(diff[1]).after.id).toBe('b1');
    expect(change(diff[3]).before.id).toBe('a3');
    expect(change(diff[3]).after.id).toBe('b2');
  });

  it('pairs an edited block that also changed its line kind and flags the attribute change', () => {
    const diff = diffBlocks(regenerated('a', ['anchor', 'quarterly results summary']), regenerated('b', ['anchor', '## quarterly results overview']));
    expect(ops(diff)).toEqual(['equal', 'change']);
    expect(change(diff[1]).attrsChanged).toBe(true);
  });

  it('pairs blocks of one type only', () => {
    const code: QuoinBlock = { id: 'c', type: 'CODE', data: { language: '', code: 'two words here' } };
    const diff = diffBlocks([md('a0', 'one'), md('a1', 'two words here')], [md('b0', 'one'), code]);
    expect(ops(diff)).toEqual(['equal', 'delete', 'insert']);
  });

  it('pairs the cell edits of a table without ids', () => {
    const table = (id: string, cell: string): QuoinBlock => ({ id, type: 'TABLE', data: { rows: [['name', cell]], header: true } });
    const diff = diffBlocks([md('a0', 'one'), table('t1', 'blue sky')], [md('b0', 'one'), table('t2', 'blue sea')]);
    expect(ops(diff)).toEqual(['equal', 'change']);
  });

  it('pairs blocks without words by their data, and reads words of nested data', () => {
    const divider = (id: string, indent?: number): QuoinBlock => ({ id, type: 'DIVIDER', data: {}, ...(indent ? { indent } : {}) });
    const diff = diffBlocks([md('a0', 'one'), divider('d1')], [md('b0', 'one'), divider('d2', 1)]);
    expect(ops(diff)).toEqual(['equal', 'change']);
    expect(change(diff[1]).attrsChanged).toBe(true);
    const custom = (id: string, title: string): QuoinBlock => ({ id, type: 'CUSTOM', data: { config: { title, tags: ['x'] } } });
    expect(ops(diffBlocks([md('a0', 'one'), custom('c1', 'red apple pie')], [md('b0', 'one'), custom('c2', 'red apple tart')]))).toEqual([
      'equal',
      'change',
    ]);
  });

  it('keeps blocks without words apart when their data differs', () => {
    const blank = (id: string, n: number): QuoinBlock => ({ id, type: 'CUSTOM', data: { n } });
    expect(ops(diffBlocks([md('a0', 'one'), blank('c1', 1)], [md('b0', 'one'), blank('c2', 2)]))).toEqual(['equal', 'delete', 'insert']);
  });

  it('pairs an edited block whose id changed even when the other ids still match', () => {
    const before = [md('a', 'intro'), md('b', 'old text here'), md('c', 'outro')];
    const after = [md('a', 'intro'), md('x', 'new text here'), md('c', 'outro')];
    expect(ops(diffBlocks(before, after))).toEqual(['equal', 'change', 'equal']);
  });

  it('does not pair a deletion and an insertion that a moved id separates', () => {
    const before = [md('a', 'red apple pie'), md('b', 'two'), md('c', 'three')];
    const after = [md('b', 'two'), md('c', 'three'), md('a', 'red apple tart')];
    expect(ops(diffBlocks(before, after))).toEqual(['delete', 'equal', 'equal', 'insert']);
  });

  it('leaves a very long run of different blocks unpaired', () => {
    const before = Array.from({ length: 200 }, (_, i) => md(`a${i}`, `shared words ${i} before`));
    const after = Array.from({ length: 200 }, (_, i) => md(`b${i}`, `shared words ${i} after`));
    const diff = diffBlocks(before, after);
    expect(diff.filter((d) => d.op === 'change')).toHaveLength(0);
    expect(diff).toHaveLength(400);
  });

  it('is stable: the same input gives the same output', () => {
    const before = regenerated('a', ['keep', 'red apple pie', 'green tea cup']);
    const after = regenerated('b', ['keep', 'red apple tart', 'green tea mug']);
    expect(diffBlocks(before, after)).toEqual(diffBlocks(before, after));
  });
});

describe('diffBlocks speed', () => {
  const words = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor'.split(' ');
  const document = (): QuoinBlock[] =>
    Array.from({ length: 1000 }, (_, i) => {
      const body = Array.from({ length: 12 }, (_, j) => words[(i + j) % words.length]).join(' ');
      const kind = i % 10;
      const markdown = kind === 0 ? `## ${body}` : kind < 4 ? `- ${body} **bold** _it_` : `${body} [link](https://x.example) \`code\``;
      return md(`b${i}`, markdown, kind === 2 ? 1 : undefined);
    });

  it('diffs a 1,000 block document by id with twenty edits in a few milliseconds', () => {
    const before = document();
    const after = before.map((block, i) => (i % 50 === 7 ? md(block.id, `${block.data.markdown} edited`, block.indent) : block));
    diffBlocks(before, after);
    const timings: number[] = [];
    for (let run = 0; run < 7; run++) {
      const start = performance.now();
      const diff = diffBlocks(before, after);
      timings.push(performance.now() - start);
      expect(diff.filter((d) => d.op === 'change')).toHaveLength(20);
    }
    expect(Math.min(...timings)).toBeLessThan(5);
  });
});
