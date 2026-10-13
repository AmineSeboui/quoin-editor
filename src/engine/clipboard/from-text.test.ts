import { describe, expect, it } from 'vitest';
import { looksLikeMarkdown, plainTextToBlocks } from './from-text';
import { sliceFromClipboard } from './slice-from-clipboard';

describe('text paste', () => {
  it.each([
    ['# Title', true],
    ['- a\n- b', true],
    ['see [x](https://y.z)', true],
    ['**bold**', true],
    ['plain words', false],
    ['3 * 4 = 12', false],
  ])('detects markdown in %j', (text, expected) => expect(looksLikeMarkdown(text)).toBe(expected));

  it('turns plain lines into literal paragraphs', () => {
    expect(plainTextToBlocks('a *b*\n\nc', () => 'x').map((b) => b.data.markdown)).toEqual(['a \\*b\\*', 'c']);
  });

  it('prefers Quoin JSON, then HTML, then text', () => {
    const slice = { blocks: [{ id: 'q', type: 'DIVIDER', data: {} }], openStart: false, openEnd: false };
    expect(sliceFromClipboard({ json: JSON.stringify({ quoin: 1, slice }), html: '<p>h</p>', text: 't' })).toEqual(slice);
    expect(sliceFromClipboard({ html: '<p>h</p>', text: 't' }, { newId: () => 'n' })).toEqual({
      blocks: [{ id: 'n', type: 'MARKDOWN', data: { markdown: 'h' } }],
      openStart: true,
      openEnd: true,
    });
    expect(sliceFromClipboard({ json: '{"bad":1}', text: '- t' }, { newId: () => 'n' })!.blocks[0].data.markdown).toBe('- t');
    expect(sliceFromClipboard({})).toBeNull();
  });
});
