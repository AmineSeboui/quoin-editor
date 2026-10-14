import { describe, expect, it } from 'vitest';
import { readSliceHTML, wrapSliceHTML } from './slice-marker';

describe('slice marker', () => {
  it('round trips Unicode JSON through HTML', () => {
    const json = JSON.stringify({ quoin: 1, slice: { blocks: [{ data: { markdown: 'café 日本 👍' } }] } });
    const html = wrapSliceHTML('<p>x</p>', json);
    expect(html.startsWith('<div data-quoin-slice="')).toBe(true);
    expect(readSliceHTML(html)).toBe(json);
    expect(readSliceHTML('<p>plain</p>')).toBeNull();
  });
});
