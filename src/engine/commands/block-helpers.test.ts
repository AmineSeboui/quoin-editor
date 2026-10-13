import { describe, expect, it } from 'vitest';
import { createSchema } from '../schema/create-schema';
import { buildState } from '../test-support/build-state';
import { DIVIDER_FIXTURE } from '../test-support/fixtures';
import {
  createBlock,
  descendantsEnd,
  isItem,
  isParagraph,
  isTextFlow,
  regionLength,
  specOf,
  startPos,
  withContent,
} from './block-helpers';
import { text } from '../model/inline';

const schema = createSchema();

describe('block helpers', () => {
  it('reads the flow of a block type, treating unknown types as void', () => {
    const state = buildState(['a', DIVIDER_FIXTURE, { id: 'u', type: 'NOPE', data: {} }]);
    const [paragraph, divider, unknown] = state.doc.blocks;
    expect(specOf(schema, paragraph).type).toBe('MARKDOWN');
    expect([paragraph, divider, unknown].map((block) => isTextFlow(schema, block))).toEqual([true, false, false]);
  });

  it('tells paragraphs and list-like items apart', () => {
    const state = buildState(['a', '# h', '- b', '- [ ] c', '> d', '1. e']);
    expect(state.doc.blocks.map(isParagraph)).toEqual([true, false, false, false, false, false]);
    expect(state.doc.blocks.map(isItem)).toEqual([false, false, true, true, true, true]);
  });

  it('measures a region, and is zero for a missing one', () => {
    const [block] = buildState(['ab**c**']).doc.blocks;
    expect(regionLength(block, 'text')).toBe(3);
    expect(regionLength(block, 'nope')).toBe(0);
  });

  it('finds the end of a block subtree by indent', () => {
    const indented = (id: string, indent: number) => ({ id, type: 'MARKDOWN', data: { markdown: id }, indent });
    const levels = [0, 1, 2, 1, 0];
    const { doc } = buildState(levels.map((level, i) => indented(`n${i}`, level)));
    expect([0, 1, 2, 3, 4].map((index) => descendantsEnd(doc, index))).toEqual([4, 3, 3, 4, 5]);
  });

  it('creates a block from the spec defaults with the given attrs merged in', () => {
    const block = createBlock(schema, 'MARKDOWN', { kind: 'bullet' }, 2, 'x');
    expect(block).toEqual({ id: 'x', type: 'MARKDOWN', indent: 2, attrs: { kind: 'bullet' }, regions: { text: [] } });
    expect(createBlock(schema, 'CALLOUT').attrs).toEqual({ tone: 'info' });
    expect(createBlock(schema, 'MARKDOWN').id).not.toBe(createBlock(schema, 'MARKDOWN').id);
  });

  it('puts content into the primary region and finds its start', () => {
    const block = withContent(schema, createBlock(schema, 'CALLOUT', {}, 0, 'c'), [text('hi')]);
    expect(block.regions).toEqual({ body: [text('hi')] });
    expect(startPos(schema, block)).toEqual({ block: 'c', region: 'body', offset: 0 });
    expect(startPos(schema, createBlock(schema, 'DIVIDER', {}, 0, 'd')).region).toBe('');
  });
});
