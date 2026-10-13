import { describe, expect, it } from 'vitest';
import { text } from '../model/inline';
import type { Command } from '../commands/command';
import { createPluginKey } from '../state/plugin';
import { Transaction } from '../state/transaction';
import { blocksOf, buildState, caretOf, markdownOf, newIds, run } from './build-state';
import { DIVIDER_FIXTURE } from './fixtures';

describe('buildState', () => {
  it('parses strings as markdown and numbers the blocks b0, b1, ...', () => {
    const callout = { id: 'q', type: 'CALLOUT', data: { tone: 'info', body: 'hi' } };
    const state = buildState(['# Title', '- item', DIVIDER_FIXTURE, callout]);
    expect(state.doc.blocks.map((block) => [block.id, block.type, block.attrs.kind])).toEqual([
      ['b0', 'MARKDOWN', 'heading'],
      ['b1', 'MARKDOWN', 'bullet'],
      ['b2', 'DIVIDER', undefined],
      ['b3', 'CALLOUT', undefined],
    ]);
  });

  it('keeps a paragraph entry as literal text', () => {
    const state = buildState([{ paragraph: '## not a heading' }, { paragraph: '' }]);
    expect(state.doc.blocks[0].attrs).toEqual({ kind: 'paragraph' });
    expect(state.doc.blocks[0].regions.text).toEqual([text('## not a heading')]);
    expect(state.doc.blocks[1].regions.text).toEqual([]);
    expect(markdownOf(state)).toEqual(['\\## not a heading', '']);
  });

  it('numbers the blocks of a split document by position', () => {
    const state = buildState(['a\n\nb', 'c']);
    expect(state.doc.blocks.map((block) => block.id)).toEqual(['b0', 'b1', 'b2']);
    expect(markdownOf(state)).toEqual(['a', 'b', 'c']);
  });

  it('selects the start of the first block unless told otherwise', () => {
    expect(caretOf(buildState(['a', 'b']))).toEqual({ block: 0, offset: 0 });
    expect(buildState([], null).selection).toBeNull();
  });

  it.each([
    [{ block: 1, offset: 2 }],
    [{ anchor: { block: 0, offset: 1 }, head: { block: 1, offset: 2 } }],
    [{ anchor: { block: 1, offset: 2 }, head: { block: 0, offset: 1 } }],
    [{ node: 2 }],
    [{ blocks: [2, 0] }],
  ] as const)('reads back the selection %j', (spec) => {
    const state = buildState(['abc', 'def', DIVIDER_FIXTURE], spec as Parameters<typeof buildState>[1]);
    expect(caretOf(state)).toEqual(spec);
  });

  it('names the region only when it is not the primary one', () => {
    const table = { id: 'x', type: 'TABLE', data: { rows: [['ab', 'cd']] } };
    const second = buildState([table], { block: 0, offset: 1, region: 'cell:0:1' });
    expect(caretOf(second)).toEqual({ block: 0, offset: 1, region: 'cell:0:1' });
    const first = buildState([table], { block: 0, offset: 1 });
    const at = { block: 'b0', region: 'cell:0:0', offset: 1 };
    expect(first.selection).toEqual({ kind: 'text', anchor: at, head: at });
    expect(caretOf(first)).toEqual({ block: 0, offset: 1 });
  });

  it('has no caret without a selection', () => {
    expect(caretOf(buildState([]))).toBeNull();
  });
});

describe('document readers', () => {
  const state = buildState([
    'plain',
    { id: 'x', type: 'MARKDOWN', data: { markdown: '- nested' }, indent: 2 },
    DIVIDER_FIXTURE,
  ]);

  it('writes MARKDOWN blocks as markdown and others as their type, indented two spaces per level', () => {
    expect(markdownOf(state)).toEqual(['plain', '    - nested', '<DIVIDER>']);
  });

  it('returns the blocks in the 0.4 shape', () => {
    expect(blocksOf(state)).toEqual([
      { id: 'b0', type: 'MARKDOWN', data: { markdown: 'plain' } },
      { id: 'b1', type: 'MARKDOWN', data: { markdown: '- nested' }, indent: 2 },
      { id: 'b2', type: 'DIVIDER', data: {} },
    ]);
  });
});

describe('run', () => {
  const typeX: Command = (state, dispatch) => {
    dispatch?.(new Transaction(state).setMeta('x', true));
    return true;
  };

  it('applies the transaction a command dispatches', () => {
    const state = buildState(['a']);
    const result = run(state, typeX);
    expect(result.ok).toBe(true);
    expect(result.tr?.getMeta('x')).toBe(true);
    expect(result.state).not.toBe(state);
  });

  it('returns the state itself when the command dispatches nothing', () => {
    const state = buildState(['a']);
    expect(run(state, () => false)).toEqual({ ok: false, state, tr: null });
  });

  it('gives the transactions of a timed state that time', () => {
    const timed = buildState(['a'], undefined, { time: 123 });
    expect(run(timed, typeX).tr?.time).toBe(123);
    expect(run(run(timed, typeX).state, typeX).tr?.time).toBe(123);
    expect(run(buildState(['a']), typeX).tr?.time).not.toBe(123);
  });

  it('passes the plugins of the options through', () => {
    const key = createPluginKey<number>('n');
    const plugin = { key, init: () => 7, apply: (_tr: Transaction, value: number) => value };
    const state = buildState(['a'], undefined, { plugins: [plugin] });
    expect(state.pluginState.get('n')).toBe(7);
  });
});

describe('newIds', () => {
  it('counts up from zero with a prefix', () => {
    const ids = newIds();
    expect([ids(), ids()]).toEqual(['n0', 'n1']);
    const other = newIds('x');
    expect([other(), newIds()()]).toEqual(['x0', 'n0']);
  });
});
