import { describe, expect, it } from 'vitest';
import { sliceFromClipboard } from './slice-from-clipboard';

const ids = () => {
  let n = 0;
  return () => `n${++n}`;
};
const shape = (data: Parameters<typeof sliceFromClipboard>[0]) => {
  const slice = sliceFromClipboard(data, { newId: ids() });
  return slice && { markdown: slice.blocks.map((b) => b.data.markdown ?? b.type), open: [slice.openStart, slice.openEnd] };
};
const json = (value: unknown) => JSON.stringify(value);
const block = { id: 'a', type: 'MARKDOWN', data: { markdown: 'x' } };

describe('sliceFromClipboard', () => {
  it('validates the Quoin json shape and otherwise falls through', () => {
    const bad: unknown[] = [
      'not json',
      { quoin: 2, slice: { blocks: [block], openStart: true, openEnd: true } },
      { quoin: 1 },
      { quoin: 1, slice: { blocks: 'x', openStart: true, openEnd: true } },
      { quoin: 1, slice: { blocks: [], openStart: true, openEnd: true } },
      { quoin: 1, slice: { blocks: [{ type: 'MARKDOWN', data: {} }], openStart: true, openEnd: true } },
      { quoin: 1, slice: { blocks: [{ ...block, data: [] }], openStart: true, openEnd: true } },
      { quoin: 1, slice: { blocks: [{ ...block, indent: -1 }], openStart: true, openEnd: true } },
      { quoin: 1, slice: { blocks: [{ ...block, indent: 1.5 }], openStart: true, openEnd: true } },
      { quoin: 1, slice: { blocks: [block], openStart: 'yes', openEnd: true } },
      { quoin: 1, slice: { blocks: [block], openStart: true } },
      [],
      null,
    ];
    for (const value of bad) {
      expect(sliceFromClipboard({ json: typeof value === 'string' ? value : json(value), text: 'fallback' })?.blocks[0].data.markdown).toBe('fallback');
    }
  });

  it('accepts indented blocks from json', () => {
    const slice = { blocks: [{ ...block, indent: 2 }], openStart: false, openEnd: true };
    expect(sliceFromClipboard({ json: json({ quoin: 1, slice }) })).toEqual(slice);
  });

  it('opens html slices only at paragraph ends', () => {
    expect(shape({ html: '<h1>x</h1><p>y</p>' })).toEqual({ markdown: ['# x', 'y'], open: [false, true] });
    expect(shape({ html: '<p>x</p><ul><li>y</li></ul>' })).toEqual({ markdown: ['x', '- y'], open: [true, false] });
  });

  it('falls back to text when the html has no blocks', () => {
    expect(shape({ html: '<script>x</script><p> </p>', text: 'plain' })).toEqual({ markdown: ['plain'], open: [true, true] });
    expect(shape({ html: '<p>h</p>' })).toEqual({ markdown: ['h'], open: [true, true] });
  });

  it('reads markdown and plain text', () => {
    expect(shape({ text: '- a\n- b' })).toEqual({ markdown: ['- a', '- b'], open: [false, false] });
    expect(shape({ text: '# T\n\ntail' })).toEqual({ markdown: ['# T', 'tail'], open: [false, true] });
    expect(shape({ text: 'one\r\ntwo\n\n  \nthree' })).toEqual({ markdown: ['one', 'two', 'three'], open: [true, true] });
    expect(shape({ text: '* item' })).toEqual({ markdown: ['- item'], open: [false, false] });
    expect(shape({ text: '' })).toBeNull();
    expect(shape({ text: ' \n ' })).toBeNull();
  });

  it('turns a lone pasted http url into a link', () => {
    const trimmed = { markdown: ['<https://a.b/x_y__z>\\_\\_'], open: [true, true] };
    expect(shape({ text: ' https://a.b/x_y__z__ \n' })).toEqual(trimmed);
    expect(shape({ text: 'http://a.b' })).toEqual({ markdown: ['<http://a.b>'], open: [true, true] });
    expect(shape({ text: 'https://a.b and more' })?.markdown).toEqual(['https://a.b and more']);
    expect(shape({ text: 'https://a.b\nhttps://c.d' })?.markdown).toEqual(['https://a.b', 'https://c.d']);
    expect(shape({ text: 'mailto:a@b.c' })?.markdown).toEqual(['mailto:a@b.c']);
  });
});
