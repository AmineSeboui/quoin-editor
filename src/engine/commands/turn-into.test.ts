import { describe, expect, it } from 'vitest';
import { historyPlugin, undo } from '../state/history';
import { buildState, caretOf, markdownOf, run, blocksOf } from '../test-support/build-state';
import { DIVIDER_FIXTURE } from '../test-support/fixtures';
import { insertText } from './insert-text';
import { setBlockType } from './turn-into';

describe('setBlockType', () => {
  it('changes MARKDOWN kinds and replaces kind attributes', () => {
    const state = buildState(['## a', '- [x] b'], { anchor: { block: 0, offset: 0 }, head: { block: 1, offset: 1 } });
    expect(markdownOf(run(state, setBlockType('MARKDOWN', { kind: 'ordered' })).state)).toEqual(['1. a', '1. b']);
    expect(markdownOf(run(state, setBlockType('MARKDOWN', { kind: 'heading', level: 3 })).state)).toEqual(['### a', '### b']);
  });

  it('moves content into a callout and back, keeping ids', () => {
    const state = buildState(['**x**'], { block: 0, offset: 0 });
    const callout = run(state, setBlockType('CALLOUT', { tone: 'tip' })).state;
    expect(blocksOf(callout)[0]).toEqual({ id: 'b0', type: 'CALLOUT', data: { tone: 'tip', body: '**x**' } });
    expect(markdownOf(run(callout, setBlockType('MARKDOWN', { kind: 'paragraph' })).state)).toEqual(['**x**']);
  });

  it('turns text into code and code into text with line breaks', () => {
    const state = buildState(['a\\\nb'], { block: 0, offset: 0 });
    const code = run(state, setBlockType('CODE', { language: '' })).state;
    expect(blocksOf(code)[0].data).toEqual({ language: '', code: 'a\nb' });
  });

  it('keeps align, colours and indent when only the kind changes', () => {
    const state = buildState([{ id: 'p', type: 'MARKDOWN', data: { markdown: '- a', align: 'center', color: 'red' }, indent: 0 }], { block: 0, offset: 0 });
    const heading = run(state, setBlockType('MARKDOWN', { kind: 'heading', level: 2 })).state;
    expect(blocksOf(heading)[0].data).toEqual({ markdown: '## a', align: 'center', color: 'red' });
    const bare = run(heading, setBlockType('MARKDOWN')).state;
    expect(blocksOf(bare)[0].data).toEqual({ markdown: 'a', align: 'center', color: 'red' });
  });

  it('merges attributes when a non-MARKDOWN block keeps its type', () => {
    const state = buildState([{ id: 'c', type: 'CALLOUT', data: { tone: 'info', body: 'x', icon: 'i' } }], { block: 0, offset: 0 });
    expect(blocksOf(run(state, setBlockType('CALLOUT', { tone: 'warn' })).state)[0].data).toEqual({ tone: 'warn', body: 'x', icon: 'i' });
  });

  it('keeps the caret at the same offset when the primary region changes name', () => {
    const state = buildState(['hello'], { anchor: { block: 0, offset: 1 }, head: { block: 0, offset: 4 } });
    const callout = run(state, setBlockType('CALLOUT')).state;
    expect(caretOf(callout)).toEqual({ anchor: { block: 0, offset: 1 }, head: { block: 0, offset: 4 } });
    expect(caretOf(run(callout, setBlockType('TOGGLE')).state)).toEqual({ anchor: { block: 0, offset: 1 }, head: { block: 0, offset: 4 } });
  });

  it('keeps indent and applies to every text block in the range, skipping void ones', () => {
    const state = buildState(
      [{ id: 'x', type: 'MARKDOWN', data: { markdown: '- a' }, indent: 0 }, { id: 'y', type: 'MARKDOWN', data: { markdown: '- b' }, indent: 1 }, DIVIDER_FIXTURE, 'c'],
      { blocks: [0, 3] },
    );
    const next = run(state, setBlockType('CALLOUT', { tone: 'tip' })).state;
    expect(next.doc.blocks.map((block) => [block.type, block.indent])).toEqual([['CALLOUT', 0], ['CALLOUT', 1], ['DIVIDER', 0], ['CALLOUT', 0]]);
    expect(next.doc.blocks.map((block) => block.id)).toEqual(['b0', 'b1', 'b2', 'b3']);
  });

  it('turns text into math using the plain text, atoms included', () => {
    const state = buildState(['x + [@Ada](mention:1)'], { block: 0, offset: 0 });
    const math = run(state, setBlockType('MATH')).state;
    expect(blocksOf(math)[0].data).toEqual({ latex: 'x + @Ada' });
    expect(caretOf(math)).toEqual({ node: 0 });
  });

  it('turns a node-selected code or math block into text', () => {
    const code = buildState([{ id: 'c', type: 'CODE', data: { language: 'ts', code: 'a\nb' } }], { node: 0 });
    const paragraph = run(code, setBlockType('MARKDOWN', { kind: 'quote' })).state;
    expect(paragraph.doc.blocks[0].regions.text).toEqual([{ kind: 'text', text: 'a\nb', marks: [] }]);
    expect(markdownOf(paragraph)).toEqual(['> a\\\nb']);
    const math = buildState([{ id: 'm', type: 'MATH', data: { latex: 'x^2' } }], { node: 0 });
    expect(markdownOf(run(math, setBlockType('MARKDOWN')).state)).toEqual(['x^2']);
    const empty = buildState([{ id: 'c', type: 'CODE', data: { language: '', code: '' } }], { node: 0 });
    expect(run(empty, setBlockType('CALLOUT')).state.doc.blocks[0].regions.body).toEqual([]);
  });

  it('puts a caret at the end of a node-selected code block that became text, so typing appends', () => {
    const state = buildState([{ id: 'c', type: 'CODE', data: { language: 'js', code: 'let a = 1' } }], { node: 0 });
    const paragraph = run(state, setBlockType('MARKDOWN', { kind: 'paragraph' })).state;
    expect(caretOf(paragraph)).toEqual({ block: 0, offset: 9 });
    expect(markdownOf(run(paragraph, insertText('z')).state)).toEqual(['let a = 1z']);
  });

  it('puts a caret at the end of a node-selected math block turned into a callout', () => {
    const state = buildState([{ id: 'm', type: 'MATH', data: { latex: 'x^2' } }], { node: 0 });
    const callout = run(state, setBlockType('CALLOUT')).state;
    expect(caretOf(callout)).toEqual({ block: 0, offset: 3 });
  });

  it('keeps a node selection on a code block that stays code', () => {
    const state = buildState([{ id: 'c', type: 'CODE', data: { language: '', code: 'x' } }], { node: 0 });
    expect(caretOf(run(state, setBlockType('CODE', { language: 'ts' })).state)).toEqual({ node: 0 });
  });

  it('turns a code block into another code block language with setAttrs semantics', () => {
    const code = buildState([{ id: 'c', type: 'CODE', data: { language: '', code: 'x' } }], { node: 0 });
    expect(blocksOf(run(code, setBlockType('CODE', { language: 'ts' })).state)[0].data).toEqual({ language: 'ts', code: 'x' });
  });

  it('refuses targets that cannot hold text and blocks that are not text', () => {
    const state = buildState(['a'], { block: 0, offset: 0 });
    expect(run(state, setBlockType('DIVIDER')).ok).toBe(false);
    expect(run(state, setBlockType('TABLE')).ok).toBe(false);
    expect(run(state, setBlockType('NOPE')).ok).toBe(false);
    expect(run(buildState([DIVIDER_FIXTURE], { node: 0 }), setBlockType('MARKDOWN')).ok).toBe(false);
    expect(run(buildState([], null), setBlockType('MARKDOWN')).ok).toBe(false);
  });

  it('undoes a conversion in one step', () => {
    const state = buildState(['**x**'], { block: 0, offset: 1 }, { plugins: [historyPlugin()] });
    const callout = run(state, setBlockType('CALLOUT')).state;
    const back = run(callout, undo).state;
    expect(markdownOf(back)).toEqual(['**x**']);
    expect(caretOf(back)).toEqual({ block: 0, offset: 1 });
  });
});
