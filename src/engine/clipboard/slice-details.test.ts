import { describe, expect, it } from 'vitest';
import { createBlockCodec } from '../blocks/codec';
import type { QuoinBlock } from '../model/quoin-block';
import { buildState } from '../test-support/build-state';
import { DIVIDER_FIXTURE } from '../test-support/fixtures';
import { sliceFromSelection } from './extract-slice';
import { sliceToClipboard } from './serialize-slice';
import type { Slice } from './slice';

const sliceOf = (...args: Parameters<typeof buildState>) => {
  const state = buildState(...args);
  return sliceFromSelection(state, createBlockCodec(state.schema));
};
const shape = (slice: Slice | null) => slice?.blocks.map((b) => `${'  '.repeat(b.indent ?? 0)}${b.data.markdown ?? `<${b.type}>`}`);
const table: QuoinBlock = { id: 't', type: 'TABLE', data: { rows: [['abc', 'def'], ['g', 'h']], header: true } };
const at = (block: number, offset: number, region?: string) => ({ block, offset, ...(region ? { region } : {}) });

describe('sliceFromSelection', () => {
  it('returns null without a selection', () => {
    expect(sliceOf(['a'], null)).toBeNull();
  });

  it('copies whole blocks of a node selection with their children, making indents relative', () => {
    const divider: QuoinBlock = { id: 'g', type: 'DIVIDER', data: {}, indent: 1 };
    const child: QuoinBlock = { id: 'c', type: 'MARKDOWN', data: { markdown: 'kid' }, indent: 2 };
    const slice = sliceOf(['top', divider, child, 'after'], { node: 1 });
    expect(shape(slice)).toEqual(['<DIVIDER>', '  kid']);
    expect(slice).toMatchObject({ openStart: false, openEnd: false });
  });

  it('copies a block range as whole blocks', () => {
    const slice = sliceOf(['a', '- b', 'c', 'd'], { blocks: [2, 1] });
    expect(shape(slice)).toEqual(['- b', 'c']);
    expect(slice).toMatchObject({ openStart: false, openEnd: false });
    expect(shape(sliceOf(['a', DIVIDER_FIXTURE], { node: 1 }))).toEqual(['<DIVIDER>']);
  });

  it('makes indents relative across a text selection', () => {
    const deep = (markdown: string, indent: number): QuoinBlock => ({ id: markdown, type: 'MARKDOWN', data: { markdown }, indent });
    const slice = sliceOf([deep('- aa', 2), deep('- bb', 3), deep('- cc', 2)], { anchor: at(0, 1), head: at(2, 1) });
    expect(shape(slice)).toEqual(['- a', '  - bb', '- c']);
  });

  it('keeps the kind and checked state of the partial ends', () => {
    expect(shape(sliceOf(['- [x] abc', 'def'], { anchor: at(0, 1), head: at(1, 2) }))).toEqual(['- [x] bc', 'de']);
  });

  it('copies a selection inside a table cell as a paragraph', () => {
    const slice = sliceOf([table], { anchor: at(0, 1, 'cell:0:0'), head: at(0, 3, 'cell:0:0') });
    expect(shape(slice)).toEqual(['bc']);
    expect(slice).toMatchObject({ openStart: true, openEnd: true });
  });

  it('copies only the flow text when a selection runs into a table cell of another block', () => {
    const toTable = sliceOf(['abc', table], { anchor: at(0, 1), head: at(1, 1, 'cell:0:1') });
    expect(shape(toTable)).toEqual(['bc']);
    const fromTable = sliceOf([table, 'xyz'], { anchor: at(0, 0, 'cell:0:1'), head: at(1, 2) });
    expect(shape(fromTable)).toEqual(['xy']);
  });

  it('copies a whole block when the selection spans regions of one block', () => {
    const slice = sliceOf([table], { anchor: at(0, 1, 'cell:0:0'), head: at(0, 1, 'cell:0:1') });
    expect(slice?.blocks.map((block) => block.type)).toEqual(['TABLE']);
  });
});

describe('sliceToClipboard', () => {
  const open = (markdown: string, extra: Partial<QuoinBlock> = {}): Slice => ({
    blocks: [{ id: 'a', type: 'MARKDOWN', data: { markdown }, ...extra }],
    openStart: true,
    openEnd: true,
  });

  it('writes json, html and the plain text of an open block', () => {
    const slice = open('## T **b**');
    const { json, html, text } = sliceToClipboard(slice);
    expect(JSON.parse(json)).toEqual({ quoin: 1, slice });
    expect(html).toBe('<h2 id="h-a">T <strong>b</strong></h2>');
    expect(text).toBe('T b');
  });

  it('writes closed slices as markdown without the trailing newline', () => {
    const { text } = sliceToClipboard({ blocks: [{ id: 'a', type: 'MARKDOWN', data: { markdown: '- x' } }], openStart: false, openEnd: false });
    expect(text).toBe('- x');
  });

  it('drops comments from the text', () => {
    expect(sliceToClipboard(open('<span data-comment="c1">hi</span> there')).text).toBe('hi there');
    const closed = { ...open('<span data-comment="c1">hi</span>'), openStart: false };
    expect(sliceToClipboard(closed).text).toBe('hi');
  });

  it('falls back to markdown when an open single block is not text', () => {
    const image: Slice = { blocks: [{ id: 'i', type: 'IMAGE', data: { storageKey: 'k', alt: 'A' } }], openStart: true, openEnd: true };
    const resolveAssetUrl = (key: string) => `https://cdn/${key}`;
    const { text, html } = sliceToClipboard(image, { resolveAssetUrl });
    expect(text).toBe('![A](https://cdn/k)');
    expect(html).toContain('https://cdn/k');
    const legacy = open('a\n\nb');
    expect(sliceToClipboard(legacy).text).toBe('a\n\nb');
  });
});
